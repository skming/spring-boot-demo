import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatLessonCode, lessonCodeHeight } from '../src/features/learn/codeView.ts'
import { activeLessonSection } from '../src/features/learn/sectionNavigation.ts'

test('lesson code height keeps short snippets readable and limits tall editors', () => {
  assert.equal(lessonCodeHeight(0), 80)
  assert.equal(lessonCodeHeight(46), 80)
  assert.equal(lessonCodeHeight(200.3), 201)
  assert.equal(lessonCodeHeight(360), 360)
  assert.equal(lessonCodeHeight(1200), 420)
})

test('JSON lesson examples use multiline indentation without changing their values', () => {
  const code =
    '{"code":0,"message":"操作成功","data":{"genres":["科幻"],"notes":"第一行\\n第二行","rating":null}}'
  const formatted = formatLessonCode(code, 'json')
  assert.ok(formatted.startsWith('{\n  "code": 0,\n'))
  assert.ok(formatted.includes('\n    "genres": [\n      "科幻"\n    ]'))
  assert.deepEqual(JSON.parse(formatted), JSON.parse(code))
  assert.equal(formatLessonCode(formatted, 'json'), formatted)
  assert.equal(formatLessonCode('[]', 'json'), '[]')
  assert.equal(formatLessonCode('null', 'json'), 'null')
})

test('incomplete JSON and other languages keep their original teaching text', () => {
  for (const code of ['', '{"title":', '{ invalid }']) {
    assert.equal(formatLessonCode(code, 'json'), code)
  }
  for (const [language, code] of [
    ['java', 'public void save() {\n    // 保留注释\n}'],
    ['sql', "SELECT 'a,b' AS note\nFROM movies"],
    ['typescript', "createMovie({\n    title: '星际穿越',\n})"],
  ])
    assert.equal(formatLessonCode(code, language), code)
})

test('the first chapter is active before the reading line reaches any chapter', () => {
  assert.equal(
    activeLessonSection(
      [
        { id: 'entry', top: 220 },
        { id: 'boundary', top: 600 },
      ],
      112,
      false,
    ),
    'entry',
  )
  assert.equal(activeLessonSection([], 112, false), '')
})

test('the reading line activates the latest chapter start, including tall chapters', () => {
  const sections = [
    { id: 'entry', top: -1000 },
    { id: 'boundary', top: -400 },
    { id: 'practice', top: 900 },
  ]
  assert.equal(activeLessonSection(sections, 112, false), 'boundary')
  assert.equal(
    activeLessonSection(
      [
        { id: 'entry', top: -600 },
        { id: 'boundary', top: 112 },
      ],
      112,
      false,
    ),
    'boundary',
  )
})

test('scrolling upward and resizing the sticky header recalculate the active chapter', () => {
  const sections = [
    { id: 'entry', top: -300 },
    { id: 'boundary', top: 145 },
  ]
  assert.equal(activeLessonSection(sections, 112, false), 'entry')
  assert.equal(activeLessonSection(sections, 168, false), 'boundary')
  assert.equal(
    activeLessonSection(
      [
        { id: 'entry', top: 110 },
        { id: 'boundary', top: 600 },
      ],
      112,
      false,
    ),
    'entry',
  )
})

test('at the page bottom the final chapter activates even if its heading cannot reach the reading line', () => {
  const sections = [
    { id: 'practice', top: -200 },
    { id: 'reference', top: 300 },
  ]
  assert.equal(activeLessonSection(sections, 112, false), 'practice')
  assert.equal(activeLessonSection(sections, 112, true), 'reference')
})
