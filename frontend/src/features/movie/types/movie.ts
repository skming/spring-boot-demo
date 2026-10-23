import type { MoviePayload } from '../movieSchema'
import type { WatchRecordInput } from '../watchRecordSchema'
export type { WatchRecordInput } from '../watchRecordSchema'

export type WatchStatus = 'WANT_TO_WATCH' | 'WATCHED'

export type WatchStatusOption = { value: WatchStatus; label: string }

export type Movie = {
  id: string
  title: string
  director: string | null
  releaseYear: number
  genres: string[]
  watchStatus: WatchStatus
  watchStatusLabel: string
  rating: number | null
  watchedOn: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  watchRecords: WatchRecord[]
}

export type WatchRecord = WatchRecordInput & { id: string; createdAt: string; updatedAt: string }

/** 编辑中的年份允许为空，提交前由 schema 校验为必填数字。 */
export type MovieInput = Omit<MoviePayload, 'releaseYear'> & { releaseYear: number | null }
