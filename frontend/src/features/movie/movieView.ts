import type { Movie, MovieInput, WatchStatusOption } from './types/movie.ts'

export function watchStatusLabel(status: string, options: WatchStatusOption[]): string {
  return options.find((option) => option.value === status)?.label ?? status
}

export const MOVIE_GENRES = [
  '剧情',
  '喜剧',
  '爱情',
  '动作',
  '科幻',
  '动画',
  '悬疑',
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
  '纪录片',
  '短片',
  '其他',
]

export const EMPTY_MOVIE: MovieInput = {
  title: '',
  director: '',
  releaseYear: null,
  genres: [],
  notes: '',
}

export function movieToInput(movie: Movie): MovieInput {
  return {
    title: movie.title,
    director: movie.director ?? '',
    releaseYear: movie.releaseYear,
    genres: [...movie.genres],
    notes: movie.notes ?? '',
  }
}

export function isMovieInputDirty(input: MovieInput, original: Movie | null): boolean {
  const baseline = original ? movieToInput(original) : EMPTY_MOVIE
  return (Object.keys(EMPTY_MOVIE) as (keyof MovieInput)[]).some((field) =>
    field === 'genres'
      ? JSON.stringify([...input.genres].sort()) !== JSON.stringify([...baseline.genres].sort())
      : input[field] !== baseline[field],
  )
}

/** date 输入框使用本地日历日期，不用 UTC ISO 字符串截取，避免跨时区错一天。 */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function movieStats(movies: Movie[]) {
  const watched = movies.filter((movie) => movie.watchStatus === 'WATCHED')
  // 影片数与观看次数分开；重看不增加影片数，未评分也不能按 0 分参与平均。
  const records = movies.flatMap((movie) => movie.watchRecords)
  const ratings = records.flatMap((record) => (record.rating == null ? [] : [record.rating]))
  return {
    total: movies.length,
    wanted: movies.length - watched.length,
    watched: watched.length,
    viewings: records.length,
    averageRating: ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null,
  }
}

/** 只从自己的想看片单抽选；有多部时避免连续抽到上一部，不产生网络请求或写入。 */
export function pickMovie(
  movies: Movie[],
  previousId: string | null = null,
  random = Math.random,
): Movie | null {
  const wanted = movies.filter((movie) => movie.watchStatus === 'WANT_TO_WATCH')
  const choices = wanted.length > 1 ? wanted.filter((movie) => movie.id !== previousId) : wanted
  return choices.length ? choices[Math.floor(random() * choices.length)] : null
}
