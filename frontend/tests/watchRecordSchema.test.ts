import assert from 'node:assert/strict'
import { test } from 'node:test'
import { localDate } from '../src/features/movie/movieView.ts'
import { watchRecordSchema } from '../src/features/movie/watchRecordSchema.ts'

const record = { watchedOn: '2024-02-29', rating: null, notes: '' }

test('viewing schema accepts today, valid leap dates and optional integer ratings', () => {
  assert.equal(watchRecordSchema.safeParse({ ...record, watchedOn: localDate() }).success, true)
  for (const rating of [null, 1, 5]) {
    assert.deepEqual(
      watchRecordSchema.parse({ ...record, rating, notes: '  观影笔记\n第二行  ' }),
      { ...record, rating, notes: '观影笔记\n第二行' },
    )
  }
  assert.equal(watchRecordSchema.safeParse({ ...record, notes: 'x'.repeat(1000) }).success, true)
  assert.equal(watchRecordSchema.safeParse({ ...record, notes: 'x'.repeat(1001) }).success, false)
})

test('viewing schema rejects empty, impossible and future dates without coercion', () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  for (const watchedOn of [
    '',
    null,
    '2025-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-1-01',
    '2026-01-01T00:00:00Z',
    localDate(tomorrow),
  ]) {
    assert.equal(watchRecordSchema.safeParse({ ...record, watchedOn }).success, false)
  }
})

test('viewing schema rejects invalid ratings, missing fields and foreign identifiers', () => {
  for (const rating of [0, 6, 1.5, NaN, Infinity, '5', '']) {
    assert.equal(watchRecordSchema.safeParse({ ...record, rating }).success, false)
  }
  for (const field of ['watchedOn', 'rating', 'notes']) {
    const input: Record<string, unknown> = { ...record }
    delete input[field]
    assert.equal(watchRecordSchema.safeParse(input).success, false)
  }
  assert.equal(watchRecordSchema.safeParse({ ...record, movieId: 'another-movie' }).success, false)
})
