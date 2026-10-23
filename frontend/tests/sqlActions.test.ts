import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sqlConfirmation, sqlResultFeedback } from '../src/features/lab/sqlActions.ts'

const result = {
  statementType: 'DELETE',
  statementTypeLabel: '删除',
  columns: ['affected_rows'],
  rows: [{ affected_rows: 0 }],
  rowCount: 1,
  affectedRows: 0,
  truncated: false,
  durationMs: 2,
  auditRecorded: true,
}

test('audit failures preserve actual execution counts and warn against retrying writes', () => {
  for (const affectedRows of [0, 1, 3, null]) {
    const feedback = sqlResultFeedback({ ...result, affectedRows, auditRecorded: false })
    assert.equal(feedback.state, 'audit-warning')
    assert.match(feedback.title, /已执行，日志未记录/)
    assert.match(feedback.description, /请勿.*重复执行/)
    assert.equal(feedback.countLabel, affectedRows === null ? '1 行' : `影响 ${affectedRows} 行`)
  }
})

test('zero affected rows do not claim that a write succeeded or count its summary as a record', () => {
  for (const [statementType, statementTypeLabel] of [
    ['DELETE', '删除'],
    ['UPDATE', '更新'],
    ['INSERT', '新增'],
  ]) {
    const feedback = sqlResultFeedback({ ...result, statementType, statementTypeLabel })
    assert.equal(feedback.state, 'no-change')
    assert.equal(feedback.title, `${statementTypeLabel}未影响任何记录`)
    assert.equal(feedback.countLabel, '影响 0 行')
    assert.match(feedback.description, /请检查/)
  }
})

test('writes with affected records show actual affected count rather than summary row count', () => {
  const feedback = sqlResultFeedback({ ...result, affectedRows: 3 })
  assert.equal(feedback.state, 'success')
  assert.equal(feedback.countLabel, '影响 3 行')
  assert.equal(
    sqlResultFeedback({ ...result, statementTypeLabel: '接口删除', affectedRows: 1 }).title,
    '接口删除完成',
  )
})

test('empty SELECT results remain successful queries, not unmatched write warnings', () => {
  const feedback = sqlResultFeedback({
    ...result,
    statementType: 'SELECT',
    statementTypeLabel: '查询',
    rows: [],
    rowCount: 0,
    affectedRows: null,
  })
  assert.equal(feedback.state, 'success')
  assert.equal(feedback.countLabel, '0 行')
})

test('ordinary SELECT does not require a mutation confirmation', () => {
  assert.equal(sqlConfirmation('  select title FROM movies'), null)
  assert.equal(sqlConfirmation('SELECT\nCOUNT(*) FROM movies'), null)
})

test('writes and ambiguous statement starts always require confirmation', () => {
  for (const sql of [
    'DELETE FROM movies WHERE id = 1',
    'UPDATE movies SET rating = 5 WHERE id = 1',
    'INSERT INTO movies VALUES (1)',
    'WITH deleted AS (DELETE FROM movies RETURNING *) SELECT * FROM deleted',
    '-- SELECT only?\nDELETE FROM movies',
    'EXPLAIN ANALYZE DELETE FROM movies',
    'SELECTED something',
  ]) {
    assert.equal(typeof sqlConfirmation(sql), 'string')
  }
})
