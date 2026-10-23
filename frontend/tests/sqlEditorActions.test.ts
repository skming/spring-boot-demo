import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_SQL_LENGTH,
  sqlExecution,
  sqlSuggestions,
} from '../src/features/lab/sqlEditorActions.ts'
import { sqlConfirmation } from '../src/features/lab/sqlActions.ts'
import type { TableDetail, TableSummary } from '../src/features/lab/types/lab.ts'

const tables: TableSummary[] = ['movies', 'users', 'operation_logs'].map((tableName) => ({
  tableName,
  tableType: 'TABLE',
}))
const movieTable: TableDetail = {
  tableName: 'movies',
  primaryKeys: ['id'],
  indexes: [],
  columns: [
    { columnName: 'title', dataType: 'VARCHAR', nullable: false, defaultValue: null },
    { columnName: 'genres', dataType: 'TEXT', nullable: false, defaultValue: null },
    { columnName: 'rating', dataType: 'INTEGER', nullable: true, defaultValue: null },
  ],
}

test('execution uses the entire document only when there is no selection', () => {
  const sql = " SELECT title FROM movies;\nDELETE FROM movies WHERE id = 'id'; "
  assert.deepEqual(sqlExecution(sql, null), { sql: sql.trim(), sourceSql: sql, scope: 'all' })
  assert.deepEqual(sqlExecution(sql, ' SELECT title FROM movies; '), {
    sql: 'SELECT title FROM movies;',
    sourceSql: sql,
    scope: 'selection',
  })
})

test('blank selections never fall back to a destructive whole document', () => {
  for (const selected of ['', ' ', '\n\t']) {
    const execution = sqlExecution("DELETE FROM movies WHERE id = 'id'", selected)
    assert.equal(execution.scope, 'selection')
    assert.equal(execution.sql, '')
  }
})

test('selection retains SQL text and goes through the same write confirmation', () => {
  const source = "SELECT title FROM movies;\nUPDATE movies SET notes = 'a;b' WHERE id = 'id'"
  const write = sqlExecution(source, source.split('\n')[1])
  assert.ok(sqlConfirmation(write.sql))
  assert.equal(write.sql, "UPDATE movies SET notes = 'a;b' WHERE id = 'id'")
  assert.equal(sqlConfirmation(sqlExecution(source, 'SELECT title FROM movies;').sql), null)
})

test('execution limits apply to the selected request rather than the document length', () => {
  const source = 'x'.repeat(MAX_SQL_LENGTH + 1)
  assert.ok(sqlExecution(source, null).sql.length > MAX_SQL_LENGTH)
  assert.equal(sqlExecution(source, 'SELECT 1').sql.length, 8)
  assert.equal(sqlExecution('x'.repeat(MAX_SQL_LENGTH), null).sql.length, MAX_SQL_LENGTH)
})

test('completion includes metadata, common SQL and quoted watch-status values', () => {
  const suggestions = sqlSuggestions(tables, movieTable, undefined, [
    { value: 'WATCHED', label: '接口已观影' },
  ])
  assert.deepEqual(
    suggestions.filter((item) => item.kind === 'table').map((item) => item.label),
    ['movies', 'users', 'operation_logs'],
  )
  assert.ok(suggestions.some((item) => item.kind === 'column' && item.label === 'genres'))
  assert.ok(suggestions.find((item) => item.label === 'rating')?.detail.includes('可空'))
  assert.ok(suggestions.some((item) => item.label === 'ORDER BY'))
  assert.equal(suggestions.find((item) => item.label === 'WATCHED')?.insertText, "'WATCHED'")
  assert.equal(suggestions.find((item) => item.label === 'WATCHED')?.detail, '接口已观影')
  assert.equal(sqlSuggestions(tables, movieTable).filter((item) => item.kind === 'value').length, 0)
  assert.ok(!suggestions.some((item) => /DROP|ALTER/.test(item.label)))
})

test('qualified completion only returns columns of the actual selected table', () => {
  assert.deepEqual(
    sqlSuggestions(tables, movieTable, 'movies').map((item) => item.label),
    ['title', 'genres', 'rating'],
  )
  assert.equal(sqlSuggestions(tables, movieTable, 'MOVIES').length, 3)
  assert.deepEqual(sqlSuggestions(tables, movieTable, 'users'), [])
  assert.deepEqual(sqlSuggestions(tables, movieTable, 'm'), [])
  assert.deepEqual(sqlSuggestions(tables, null, 'movies'), [])
  assert.equal(sqlSuggestions(tables, null).filter((item) => item.kind === 'column').length, 0)
})
