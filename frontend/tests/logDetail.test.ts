import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatLogDetail, previewLogDetail } from '../src/features/log/logDetail.ts'

test('movie log summaries use the saved snapshot or deleted snapshot', () => {
  const movie = {
    title: '霸王别姬',
    genres: ['剧情', '爱情'],
    watchStatus: 'WATCHED',
    watchStatusLabel: '接口已观影',
    rating: 5,
  }
  for (const detail of [
    { before: null, after: movie },
    { before: movie, after: null },
  ]) {
    assert.equal(
      previewLogDetail(JSON.stringify(detail)),
      '霸王别姬 · 接口已观影 · 剧情 / 爱情 · 5 星',
    )
  }
})

test('older snapshots without a label preserve the raw enum instead of inventing a description', () => {
  assert.equal(
    previewLogDetail(JSON.stringify({ after: { title: '电影', watchStatus: 'WATCHED' } })),
    '电影 · WATCHED',
  )
})

test('expanded snapshots preserve all fields and escaped notes', () => {
  const detail = {
    ownerId: 'owner',
    before: null,
    after: { title: '电影', notes: '台词"与换行\n'.repeat(100) },
  }
  const formatted = formatLogDetail(JSON.stringify(detail))
  assert.deepEqual(JSON.parse(formatted), detail)
  assert.ok(formatted.includes('\n  "ownerId"'))
})

test('SQL and malformed details remain readable and summaries remain bounded', () => {
  assert.equal(formatLogDetail('SELECT title FROM movies'), 'SELECT title FROM movies')
  assert.equal(previewLogDetail('SELECT\n title FROM movies'), 'SELECT title FROM movies')
  assert.equal(formatLogDetail(''), '—')
  assert.equal(previewLogDetail('{broken'), '{broken')
  assert.equal(previewLogDetail('x'.repeat(100)).length, 49)
})
