import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EMPTY_MOVIE,
  isMovieInputDirty,
  localDate,
  MOVIE_GENRES,
  movieStats,
  movieToInput,
  pickMovie,
  watchStatusLabel,
} from '../src/features/movie/movieView.ts'
import type { Movie } from '../src/features/movie/types/movie.ts'
import { releaseYearSchema } from '../src/features/movie/movieSchema.ts'

function movie(id: string, overrides: Partial<Movie> = {}): Movie {
  return {
    id,
    title: `movie-${id}`,
    director: null,
    releaseYear: 2014,
    genres: ['科幻'],
    watchStatus: 'WANT_TO_WATCH',
    watchStatusLabel: '接口状态',
    rating: null,
    watchedOn: null,
    notes: null,
    watchRecords: [],
    createdAt: '2026-10-09T00:00:00Z',
    updatedAt: '2026-10-09T00:00:00Z',
    ...overrides,
  }
}

test('status labels use API options even for an empty diary and do not guess unknown labels', () => {
  assert.equal(
    watchStatusLabel('WATCHED', [{ value: 'WATCHED', label: '接口已观影' }]),
    '接口已观影',
  )
  assert.equal(watchStatusLabel('WATCHED', []), 'WATCHED')
  assert.equal(watchStatusLabel('UNKNOWN', []), 'UNKNOWN')
})

test('genre options cover common categories without duplicates and preserve the original options', () => {
  assert.equal(MOVIE_GENRES.length, 25)
  assert.equal(new Set(MOVIE_GENRES).size, MOVIE_GENRES.length)
  assert.ok(
    MOVIE_GENRES.every((genre) => genre.trim() === genre && genre.length > 0 && genre.length <= 40),
  )
  for (const genre of [
    '科幻',
    '动画',
    '剧情',
    '喜剧',
    '悬疑',
    '动作',
    '纪录片',
    '其他',
    '爱情',
    '犯罪',
    '惊悚',
    '恐怖',
    '奇幻',
    '冒险',
    '战争',
    '历史',
    '传记',
    '家庭',
    '音乐',
    '歌舞',
    '武侠',
    '西部',
    '运动',
    '灾难',
    '短片',
  ]) {
    assert.ok(MOVIE_GENRES.includes(genre), `Missing genre: ${genre}`)
  }
  assert.equal(MOVIE_GENRES.at(-1), '其他')
  assert.deepEqual(EMPTY_MOVIE.genres, [])
})

test('editing preserves multiple genres including custom values without creating a false change', () => {
  const original = movie('a', { genres: ['爱情', '黑色电影', '犯罪'] })
  const input = movieToInput(original)
  assert.deepEqual(input.genres, original.genres)
  assert.notEqual(input.genres, original.genres)
  assert.equal(isMovieInputDirty(input, original), false)
  assert.equal(
    isMovieInputDirty({ ...input, genres: [...input.genres].reverse() }, original),
    false,
  )
  assert.equal(isMovieInputDirty({ ...input, genres: ['爱情', '犯罪'] }, original), true)
  input.genres.push('惊悚')
  assert.deepEqual(original.genres, ['爱情', '黑色电影', '犯罪'])
})

test('movie stats exclude unrated films and wishlist entries from the average', () => {
  assert.deepEqual(movieStats([]), {
    total: 0,
    wanted: 0,
    watched: 0,
    viewings: 0,
    averageRating: null,
  })
  const record = (id: string, rating: number | null) => ({
    id,
    rating,
    watchedOn: '2026-01-01',
    notes: '',
    createdAt: '',
    updatedAt: '',
  })
  const stats = movieStats([
    movie('a'),
    movie('b', { watchStatus: 'WATCHED', watchRecords: [record('1', 5), record('2', 2)] }),
    movie('c', { watchStatus: 'WATCHED', watchRecords: [record('3', null)] }),
  ])
  assert.deepEqual(stats, { total: 3, wanted: 1, watched: 2, viewings: 3, averageRating: 3.5 })
})

test('tonight selection only uses wishlist entries and avoids the previous choice', () => {
  const movies = [movie('a'), movie('watched', { watchStatus: 'WATCHED' }), movie('b')]
  assert.equal(pickMovie(movies, null, () => 0)?.id, 'a')
  assert.equal(pickMovie(movies, null, () => 0.999999)?.id, 'b')
  assert.equal(pickMovie(movies, 'a', () => 0)?.id, 'b')
  assert.equal(pickMovie([movie('only')], 'only', () => 0)?.id, 'only')
  assert.equal(pickMovie([]), null)
  assert.equal(pickMovie([movie('watched', { watchStatus: 'WATCHED' })]), null)
})

test('movie input excludes derived status and viewing facts, so editing does not overwrite history', () => {
  const input = movieToInput(
    movie('a', {
      watchStatus: 'WATCHED',
      rating: 5,
      watchedOn: '2026-10-08',
      notes: '记住这个镜头',
    }),
  )
  assert.deepEqual(Object.keys(input).sort(), [
    'director',
    'genres',
    'notes',
    'releaseYear',
    'title',
  ])
  assert.equal(input.notes, '记住这个镜头')
})

test('dirty detection covers new forms, edits, nullable details and note changes', () => {
  assert.equal(isMovieInputDirty(EMPTY_MOVIE, null), false)
  assert.equal(isMovieInputDirty({ ...EMPTY_MOVIE, title: 'new movie' }, null), true)
  const original = movie('a')
  const input = movieToInput(original)
  assert.equal(input.director, '')
  assert.equal(input.notes, '')
  assert.equal(isMovieInputDirty(input, original), false)
  assert.equal(isMovieInputDirty({ ...input, notes: '观影感想' }, original), true)
  assert.equal(isMovieInputDirty({ ...input, director: '导演' }, original), true)
  assert.equal(isMovieInputDirty({ ...input, genres: ['科幻', '剧情'] }, original), true)
  assert.equal(isMovieInputDirty({ ...input, genres: ['科幻'] }, original), false)
  assert.notEqual(input.genres, original.genres)
})

test('local calendar dates preserve the local day and zero-pad month and day', () => {
  assert.equal(localDate(new Date(2026, 0, 2, 0, 30)), '2026-01-02')
  assert.equal(localDate(new Date(2026, 9, 9, 23, 59)), '2026-10-09')
})

test('release year editing preserves numeric values and detects changes and clearing', () => {
  const original = movie('year', { releaseYear: 2014 })
  const input = movieToInput(original)
  assert.equal(input.releaseYear, 2014)
  assert.equal(isMovieInputDirty(input, original), false)
  assert.equal(isMovieInputDirty({ ...input, releaseYear: 1994 }, original), true)
  assert.equal(isMovieInputDirty({ ...input, releaseYear: null }, original), true)
  assert.equal(movieToInput(movie('unknown')).releaseYear, 2014)
  assert.equal(EMPTY_MOVIE.releaseYear, null)
  assert.equal(isMovieInputDirty({ ...EMPTY_MOVIE, releaseYear: 2014 }, null), true)
})

test('release year requires integer bounds and rejects empty or invalid numbers', () => {
  for (const year of [1888, 2014, 2100])
    assert.equal(releaseYearSchema.safeParse(year).success, true)
  for (const year of [null, 1887, 2101, 2014.5, 0, NaN, Infinity, -Infinity]) {
    assert.equal(releaseYearSchema.safeParse(year).success, false)
  }
})
