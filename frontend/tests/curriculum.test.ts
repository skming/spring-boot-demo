import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import {
  COURSE_UNITS,
  LESSONS,
  MAIN_ROUTE,
  TOPIC_ROUTE,
  REQUIRED_LESSONS,
  lessonNeighbors,
  topicMainContinuation,
} from '../src/features/learn/curriculum.ts'
import { formatLessonCode } from '../src/features/learn/codeView.ts'

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const lessonById = (id: string) => {
  const lesson = LESSONS.find((item) => item.id === id)
  assert.ok(lesson, `Missing lesson: ${id}`)
  return lesson
}

test('every lesson has readable code, actual source and distinct prediction, action and evidence', () => {
  assert.equal(new Set(LESSONS.map((lesson) => lesson.id)).size, LESSONS.length)
  assert.equal(new Set(COURSE_UNITS.map((unit) => unit.id)).size, COURSE_UNITS.length)
  for (const [index, lesson] of LESSONS.entries()) {
    assert.match(lesson.id, /^[a-z]+(?:-[a-z]+)*$/)
    assert.equal(lesson.number, index + 1)
    assert.ok(COURSE_UNITS.some((unit) => unit.id === lesson.unit))
    assert.ok(lesson.paragraphs.length >= 2)
    for (const value of [lesson.prediction, lesson.exercise, lesson.verification])
      assert.ok(value.length > 15)
    assert.equal(lesson.quiz.scenario, lesson.prediction)
    assert.ok(lesson.reference.url.startsWith('https://'))
    assert.ok(lesson.source.path.startsWith('backend/'))
    const source = readFileSync(new URL(`../../${lesson.source.path}`, import.meta.url), 'utf8')
    assert.ok(
      source.includes(lesson.source.symbol),
      `Source drift: ${lesson.id}: ${lesson.source.symbol}`,
    )
    if (lesson.source.exact) {
      assert.ok(normalize(source).includes(normalize(lesson.code)), `Excerpt drift: ${lesson.id}`)
    }
    const code = formatLessonCode(lesson.code, lesson.language)
    for (const line of code.split('\n'))
      assert.ok(line.length <= 100, `Long code line in ${lesson.id}: ${line}`)
    if (lesson.language === 'json') assert.deepEqual(JSON.parse(code), JSON.parse(lesson.code))
    assert.doesNotMatch(
      JSON.stringify(lesson),
      /Toast|CopyButton|Clipboard|isMovieInputDirty|movieApi|Vite|React|sessionStorage|pnpm|前端/,
    )
  }
})

test('prerequisites form an ordered acyclic main route with non-uniform explicit units', () => {
  assert.equal(COURSE_UNITS.length, 9)
  assert.ok(
    new Set(COURSE_UNITS.map((unit) => LESSONS.filter((lesson) => lesson.unit === unit.id).length))
      .size > 1,
  )
  for (const unit of COURSE_UNITS) assert.ok(LESSONS.some((lesson) => lesson.unit === unit.id))
  for (const lesson of LESSONS) {
    assert.equal(new Set(lesson.prerequisites).size, lesson.prerequisites.length)
    for (const id of lesson.prerequisites) {
      const prerequisite = lessonById(id)
      assert.ok(
        prerequisite.number < lesson.number,
        `${lesson.id} requires a later or cyclic lesson`,
      )
      if (!lesson.optional) assert.equal(prerequisite.optional, false)
    }
  }
  assert.ok(lessonById('data-model').number < lessonById('sql-select').number)
  assert.ok(lessonById('java-bridge').number < lessonById('watch-relationship').number)
  assert.ok(lessonById('response-errors').number < lessonById('movie-create').number)
  assert.ok(lessonById('sql-join').number < lessonById('sql-aggregate').number)
  assert.ok(lessonById('transaction-required').number < lessonById('operation-audit').number)
  assert.equal(lessonById('movie-update').language, 'java')
  assert.ok(lessonById('movie-update').paragraphs.join('').includes('受管实体'))
})

test('fast route brings the first edit forward and keeps advanced topics out of required prerequisites', () => {
  assert.deepEqual(
    LESSONS.map((lesson) => lesson.id),
    [...MAIN_ROUTE, ...TOPIC_ROUTE],
  )
  assert.equal(new Set([...MAIN_ROUTE, ...TOPIC_ROUTE]).size, LESSONS.length)
  assert.deepEqual(
    REQUIRED_LESSONS.map((lesson) => lesson.id),
    [...MAIN_ROUTE],
  )
  assert.equal(lessonById('first-change').number, 9)
  assert.ok(lessonById('pagination').number < lessonById('movie-create').number)
  for (const id of ['ownership', 'transaction-commit', 'transaction-required', 'operation-audit']) {
    assert.equal(lessonById(id).optional, false)
  }
  for (const id of TOPIC_ROUTE) assert.equal(lessonById(id).optional, true)
  assert.match(lessonById('spring-beans').paragraphs.join(''), /@Bean.*getter\/setter/s)
  assert.match(lessonById('java-bridge').paragraphs.join(''), /Integer.*NullPointerException/s)
  assert.match(lessonById('development-workflow').paragraphs.join(''), /断点.*Caused by/s)
  const featureWalkthrough = lessonById('feature-walkthrough').paragraphs.join('')
  assert.match(featureWalkthrough, /已实现.*发行年份必填.*导演也必填.*Repository.*回滚/s)
  assert.doesNotMatch(featureWalkthrough, /尚未实现|1888\/2100\/null成功/)
  assert.match(lessonById('independent-change').exercise, /originalTitle.*100\/101/)
})

test('required navigation never forces the MySQL elective and correctly handles both ends', () => {
  assert.equal(lessonNeighbors(REQUIRED_LESSONS[0]).previous, undefined)
  assert.equal(lessonNeighbors(REQUIRED_LESSONS.at(-1)!).next, undefined)
  for (const [index, lesson] of REQUIRED_LESSONS.entries()) {
    assert.deepEqual(lessonNeighbors(lesson), {
      previous: REQUIRED_LESSONS[index - 1],
      next: REQUIRED_LESSONS[index + 1],
    })
  }
  const elective = lessonById('requires-new')
  assert.equal(elective.optional, true)
  assert.match(elective.paragraphs.join(''), /Docker\/MySQL/)
  assert.match(elective.code, /Propagation.REQUIRES_NEW/)
  assert.equal(lessonNeighbors(elective).previous?.id, 'transaction-checked')
  assert.equal(lessonNeighbors(elective).next, undefined)
})

test('topics have their own ordered navigation and an explicit continuation on the main route', () => {
  const topics = TOPIC_ROUTE.map(lessonById)
  for (const [index, topic] of topics.entries()) {
    assert.deepEqual(lessonNeighbors(topic), {
      previous: topics[index - 1],
      next: topics[index + 1],
    })
    assert.equal(topicMainContinuation(topic).optional, false)
  }
  assert.equal(topicMainContinuation(lessonById('java-collections')).id, 'java-bridge')
  assert.equal(topicMainContinuation(lessonById('genres-converter')).id, 'watch-crud')
  assert.equal(topicMainContinuation(lessonById('requires-new')).id, 'operation-audit')
  assert.equal(
    topicMainContinuation({ ...topics[0], prerequisites: [] }).id,
    REQUIRED_LESSONS[0].id,
  )
  assert.equal(
    topicMainContinuation({ ...topics[0], prerequisites: ['independent-change'] }).id,
    'independent-change',
  )
})

test('question answers reference stable option IDs rather than positions', () => {
  const positions = LESSONS.map((lesson) =>
    lesson.quiz.options.findIndex((option) => option.value === lesson.quiz.answer),
  )
  assert.equal(new Set(positions).size, 2)
  assert.ok(positions.some((position, index) => index > 0 && position === positions[index - 1]))
  assert.ok(
    LESSONS.every((lesson) =>
      lesson.quiz.options.every((option) => option.value.startsWith(`${lesson.id}-`)),
    ),
  )
  for (const [id, expected] of [
    ['data-model', '只增加一条 watch_records'],
    ['sql-insert', '必须引用已存在电影'],
    ['sql-select', 'rating IS NULL'],
    ['transaction-required', '默认加入已有事务'],
    ['transaction-checked', '需要分析回滚配置'],
    ['requires-new', '不会，独立事务已单独提交'],
  ]) {
    const quiz = lessonById(id).quiz
    assert.ok(
      quiz.options.find((option) => option.value === quiz.answer)!.label.includes(expected),
      `Wrong answer: ${id}`,
    )
  }
})

function sampleDatabase() {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(
    readFileSync(
      new URL('../../backend/src/main/resources/db/lesson-samples.sql', import.meta.url),
      'utf8',
    ),
  )
  return db
}

test('all SQL examples have actual behavioral checks including successful writes and rejection paths', () => {
  for (const lesson of LESSONS.filter((item) => item.language === 'sql')) {
    const db = sampleDatabase()
    try {
      switch (lesson.id) {
        case 'data-model': {
          const rows = db.prepare(lesson.code).all()
          assert.equal(rows.length, 3)
          assert.equal(
            rows.filter((row) => row.owner_id === '11111111-1111-4111-8111-111111111111').length,
            2,
          )
          break
        }
        case 'sql-select':
          assert.equal(db.prepare(lesson.code).all().length, 1)
          assert.equal(db.prepare(lesson.code.replace('IS NULL', '= NULL')).all().length, 0)
          break
        case 'sql-filter': {
          assert.equal(db.prepare(lesson.code).all()[0].title, '星际穿越')
          assert.equal(db.prepare(lesson.code.replace('LIMIT 1', 'LIMIT 2')).all().length, 2)
          const other = lesson.code.replace(
            '11111111-1111-4111-8111-111111111111',
            '22222222-2222-4222-8222-222222222222',
          )
          assert.equal(db.prepare(other).all()[0].title, '霸王别姬')
          break
        }
        case 'sql-insert': {
          assert.equal(db.prepare(lesson.code).run().changes, 1)
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM watch_records').get()!.n, 4)
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM movies').get()!.n, 3)
          assert.throws(() => db.prepare(lesson.code).run(), /UNIQUE/)
          const invalid = lesson.code
            .replace('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
            .replace('00000000-0000-4000-8000-000000000001', 'missing-movie')
          assert.throws(() => db.prepare(invalid).run(), /FOREIGN KEY/)
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM watch_records').get()!.n, 4)
          break
        }
        case 'sql-update': {
          assert.equal(db.prepare(lesson.code).run().changes, 1)
          assert.equal(
            db
              .prepare("SELECT notes FROM movies WHERE id = '00000000-0000-4000-8000-000000000001'")
              .get()!.notes,
            '周末重看',
          )
          assert.equal(
            db.prepare(lesson.code.replace('00000000-0000-4000-8000-000000000001', 'missing')).run()
              .changes,
            0,
          )
          assert.equal(
            db.prepare('SELECT COUNT(*) AS n FROM movies WHERE notes IS NULL').get()!.n,
            2,
          )
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM watch_records').get()!.n, 3)
          break
        }
        case 'sql-delete':
          assert.equal(db.prepare(lesson.code).run().changes, 1)
          assert.equal(db.prepare(lesson.code).run().changes, 0)
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM watch_records').get()!.n, 2)
          assert.equal(db.prepare('SELECT COUNT(*) AS n FROM movies').get()!.n, 3)
          assert.throws(() => db.prepare('SELECT FROM movies').all(), /syntax/)
          break
        case 'sql-join': {
          const rows = db.prepare(lesson.code).all()
          assert.equal(rows.length, 3)
          assert.equal(rows.find((row) => row.title === '千与千寻')!.rating, null)
          assert.equal(db.prepare(lesson.code.replace('LEFT JOIN', 'INNER JOIN')).all().length, 2)
          const filtered = lesson.code.replace('ORDER BY', 'AND w.rating >= 4\nORDER BY')
          assert.equal(db.prepare(filtered).all().length, 1)
          break
        }
        case 'sql-aggregate': {
          const rows = db.prepare(lesson.code).all()
          assert.deepEqual(
            rows.map((row) => ({ ...row })),
            [
              { title: '千与千寻', viewing_count: 0, average_rating: null },
              { title: '星际穿越', viewing_count: 2, average_rating: 4 },
              { title: '霸王别姬', viewing_count: 1, average_rating: null },
            ],
          )
          const all = db
            .prepare('SELECT COUNT(rating) AS rated, AVG(rating) AS average FROM watch_records')
            .get()
          assert.deepEqual({ ...all }, { rated: 2, average: 4 })
          assert.equal(
            db.prepare(lesson.code.replace('COUNT(w.id)', 'COUNT(*)')).all()[0].viewing_count,
            1,
          )
          break
        }
        default:
          assert.fail(`SQL lesson ${lesson.id} needs a behavioral check`)
      }
    } finally {
      db.close()
    }
  }
})
