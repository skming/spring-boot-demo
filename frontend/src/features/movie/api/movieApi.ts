import { http } from '../../../shared/api/http'
import type { Movie, WatchStatusOption, WatchRecordInput } from '../types/movie'
import type { MoviePayload } from '../movieSchema'

export function listWatchStatuses(): Promise<WatchStatusOption[]> {
  return http<WatchStatusOption[]>('/api/v1/movies/watch-statuses')
}

export function listMovies(): Promise<Movie[]> {
  return http<Movie[]>('/api/v1/movies')
}

export function createMovie(input: MoviePayload): Promise<Movie> {
  return http<Movie>('/api/v1/movies', { method: 'POST', body: input })
}

export function updateMovie(id: string, input: MoviePayload): Promise<Movie> {
  return http<Movie>(`/api/v1/movies/${id}`, { method: 'PUT', body: input })
}

export function deleteMovie(id: string): Promise<void> {
  return http<void>(`/api/v1/movies/${id}`, { method: 'DELETE' })
}

export function saveWatchRecord(
  movieId: string,
  recordId: string | null,
  input: WatchRecordInput,
): Promise<Movie> {
  return http<Movie>(`/api/v1/movies/${movieId}/watch-records${recordId ? `/${recordId}` : ''}`, {
    method: recordId ? 'PUT' : 'POST',
    body: input,
  })
}

export function deleteWatchRecord(movieId: string, recordId: string): Promise<Movie> {
  return http<Movie>(`/api/v1/movies/${movieId}/watch-records/${recordId}`, { method: 'DELETE' })
}
