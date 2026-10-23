import assert from 'node:assert/strict'
import { test } from 'node:test'
import { movieInputSchema } from '../src/features/movie/movieSchema.ts'

const valid = {
  title: '星际穿越',
  director: '克里斯托弗·诺兰',
  releaseYear: 2014,
  genres: ['科幻'],
  notes: '',
}

test('movie schema normalizes text and retains a numeric release year', () => {
  const parsed = movieInputSchema.parse({
    ...valid,
    title: '  星际穿越  ',
    director: '  诺兰  ',
    notes: '  想看  ',
    genres: [' 科幻 '],
  })
  assert.deepEqual(parsed, { ...valid, director: '诺兰', notes: '想看' })
  assert.equal(typeof parsed.releaseYear, 'number')
  assert.equal(valid.director, '克里斯托弗·诺兰')
})

test('movie schema rejects missing required fields and invalid year types', () => {
  for (const field of ['title', 'director', 'releaseYear', 'genres']) {
    const missing: Record<string, unknown> = { ...valid }
    delete missing[field]
    assert.equal(movieInputSchema.safeParse(missing).success, false, field)
    assert.equal(movieInputSchema.safeParse({ ...valid, [field]: null }).success, false, field)
  }
  for (const year of ['', '2014', 1887, 2101, 2014.5, NaN, Infinity]) {
    const result = movieInputSchema.safeParse({ ...valid, releaseYear: year })
    assert.equal(result.success, false)
    if (!result.success) assert.equal(result.error.issues[0].path[0], 'releaseYear')
  }
  for (const year of [1888, 2100]) {
    assert.equal(movieInputSchema.safeParse({ ...valid, releaseYear: year }).success, true)
  }
})

test('movie schema enforces text and genre boundaries and does not accept ownerId', () => {
  for (const field of ['title', 'director']) {
    for (const value of ['', ' \t\n', 'x'.repeat(101)]) {
      assert.equal(movieInputSchema.safeParse({ ...valid, [field]: value }).success, false)
    }
    assert.equal(movieInputSchema.safeParse({ ...valid, [field]: 'x'.repeat(100) }).success, true)
  }
  for (const genres of [[], [' '], ['x'.repeat(41)], Array(9).fill('科幻')]) {
    assert.equal(movieInputSchema.safeParse({ ...valid, genres }).success, false)
  }
  assert.equal(
    movieInputSchema.safeParse({ ...valid, genres: Array(8).fill('x'.repeat(40)) }).success,
    true,
  )
  assert.equal(movieInputSchema.safeParse({ ...valid, notes: 'x'.repeat(1000) }).success, true)
  assert.equal(movieInputSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) }).success, false)
  assert.equal(movieInputSchema.safeParse({ ...valid, ownerId: 'another-user' }).success, false)
})
