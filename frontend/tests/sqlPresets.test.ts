import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { buildSqlPresets } from '../src/features/lab/sqlPresets.ts'

const ownerId = 'f312f041-970b-4b6d-aec4-0f5096196af3'

test('INSERT uses a standard UUID literal instead of database-specific functions', () => {
  const sql = buildSqlPresets(ownerId).find((preset) => preset.label === '新增一条')!.sql
  assert.match(
    sql,
    /VALUES\s*\(\s*'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'/i,
  )
  assert.doesNotMatch(sql, /randomblob|hex\(|random\(/i)
  assert.ok(sql.includes(`'${ownerId}'`))
})

test('regenerating templates gives INSERT a new UUID', () => {
  const insert = () => buildSqlPresets(ownerId).find((preset) => preset.label === '新增一条')!.sql
  assert.notEqual(insert(), insert())
})

test('missing or invalid current user never falls back to another user', () => {
  for (const id of [null, undefined, '', 'invalid-id', "' OR 1=1 --"]) {
    const presets = buildSqlPresets(id)
    assert.ok(presets.some((preset) => preset.label === '查询列表'))
    assert.ok(presets.every((preset) => !/^(INSERT|UPDATE|DELETE)/.test(preset.sql)))
    assert.ok(presets.every((preset) => !preset.sql.includes('SELECT id FROM users')))
  }
})

test('owner-specific updates and deletes keep a WHERE clause', () => {
  for (const preset of buildSqlPresets(ownerId)) {
    if (/^(UPDATE|DELETE)/.test(preset.sql)) {
      assert.match(preset.sql, /\bWHERE\b/)
      assert.ok(preset.sql.includes(`'${ownerId}'`))
    }
  }
})

test('all movie templates execute on disposable SQLite and do not modify another users movies', () => {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec('PRAGMA foreign_keys = ON')
    database.exec(
      readFileSync(
        new URL('../../backend/src/main/resources/db/schema-sqlite.sql', import.meta.url),
        'utf8',
      ),
    )
    const otherId = crypto.randomUUID()
    database
      .prepare(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'test-only', CURRENT_TIMESTAMP)",
      )
      .run(ownerId, 'owner@example.com')
    database
      .prepare(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'test-only', CURRENT_TIMESTAMP)",
      )
      .run(otherId, 'other@example.com')
    database
      .prepare(`INSERT INTO movies (id, title, director, release_year, genres, owner_id, created_at, updated_at)
      VALUES (?, 'SQL观影演示', '教学导演', 2014, '["剧情"]', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run(crypto.randomUUID(), otherId)
    const presets = buildSqlPresets(ownerId)
    for (const preset of presets) {
      const statement = database.prepare(preset.sql)
      if (preset.sql.startsWith('SELECT')) statement.all()
      else {
        statement.run()
        if (preset.label === '新增一条') {
          const row = database.prepare('SELECT genres FROM movies WHERE owner_id = ?').get(ownerId)
          assert.deepEqual(JSON.parse(String(row?.genres)), ['科幻'])
        }
      }
    }
    assert.equal(
      database.prepare('SELECT COUNT(*) AS count FROM movies WHERE owner_id = ?').get(ownerId)
        ?.count,
      0,
    )
    assert.equal(
      database.prepare('SELECT COUNT(*) AS count FROM movies WHERE owner_id = ?').get(otherId)
        ?.count,
      1,
    )
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM watch_records').get()?.count, 0)
    assert.ok(presets.some((preset) => preset.label === '类型偏好'))
    assert.ok(presets.some((preset) => preset.label === '我的高分片'))
    assert.ok(presets.every((preset) => !preset.sql.includes('FROM tasks')))
    assert.ok(presets.every((preset) => !preset.sql.includes('movie_genres')))
  } finally {
    database.close()
  }
})

test('roadmap SQL files use the current schema and their examples can be executed', () => {
  const database = new DatabaseSync(':memory:')
  try {
    database.exec('PRAGMA foreign_keys = ON')
    database.exec(
      readFileSync(
        new URL('../../backend/src/main/resources/db/schema-sqlite.sql', import.meta.url),
        'utf8',
      ),
    )
    database
      .prepare(
        "INSERT INTO users VALUES (?, 'roadmap@example.test', 'test-only-hash', CURRENT_TIMESTAMP)",
      )
      .run(ownerId)
    for (const filename of ['00-explore.sql', '01-select-movies.sql', '02-dml-with-where.sql']) {
      const sql = readFileSync(
        new URL(`../../learning-roadmap/sql/${filename}`, import.meta.url),
        'utf8',
      )
        .replaceAll('<current-user-id>', ownerId)
        .replaceAll('<new-movie-id>', crypto.randomUUID())
        .replaceAll('<new-watch-id>', crypto.randomUUID())
      database.exec(sql)
    }
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM movies').get()?.count, 0)
    assert.equal(database.prepare('SELECT COUNT(*) AS count FROM watch_records').get()?.count, 0)
  } finally {
    database.close()
  }
})
