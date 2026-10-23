import { Chip, Table } from '@heroui/react'
import { Star } from 'lucide-react'
import type { Movie } from '../types/movie'
import { MovieRecordActions } from './MovieRecordActions'

type MovieListViewProps = {
  movies: Movie[]
  disabled: boolean
  onEdit: (movie: Movie) => void
  onDetails: (movie: Movie) => void
  onToggle: (movie: Movie) => void
  onObserve: (movie: Movie) => void
  onDelete: (movie: Movie) => void
}

export function MovieListView({
  movies,
  disabled,
  onEdit,
  onDetails,
  onToggle,
  onObserve,
  onDelete,
}: MovieListViewProps) {
  return (
    <div className="overflow-hidden border border-border bg-surface p-2 shadow-sm">
      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label="观影片单列表" className="min-w-[1100px]">
            <Table.Header>
              <Table.Column id="movie" isRowHeader>
                电影
              </Table.Column>
              <Table.Column id="notes">电影备注</Table.Column>
              <Table.Column id="genres">类型</Table.Column>
              <Table.Column id="status">状态</Table.Column>
              <Table.Column id="rating">最近评分</Table.Column>
              <Table.Column id="date">最近观影日期</Table.Column>
              <Table.Column id="actions" className="text-right">
                操作
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {movies.map((movie) => (
                <Table.Row key={movie.id} id={movie.id} textValue={movie.title}>
                  <Table.Cell className="align-top">
                    <div className="min-w-44 max-w-60 space-y-2 py-1">
                      <p className="whitespace-normal break-words font-semibold">{movie.title}</p>
                      <p className="whitespace-normal break-words text-xs text-muted">
                        {movie.releaseYear != null && (
                          <span aria-label="发行年份">{movie.releaseYear} · </span>
                        )}
                        {movie.director || '导演待补充'}
                      </p>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <p className="w-64 truncate py-1 text-sm leading-6 text-muted">
                      {movie.notes || '暂无电影备注'}
                    </p>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <div
                      role="group"
                      aria-label="电影类型"
                      className="flex max-w-40 flex-wrap gap-1.5"
                    >
                      {movie.genres.length ? (
                        movie.genres.map((genre) => (
                          <Chip
                            key={genre}
                            size="sm"
                            variant="soft"
                            color="accent"
                            className="h-auto max-w-full"
                          >
                            <Chip.Label className="whitespace-normal break-words">
                              {genre}
                            </Chip.Label>
                          </Chip>
                        ))
                      ) : (
                        <span className="text-xs text-muted">未分类</span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <div className="space-y-1">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={movie.watchStatus === 'WATCHED' ? 'success' : 'accent'}
                      >
                        <Chip.Label>{movie.watchStatusLabel}</Chip.Label>
                      </Chip>
                      <p className="text-xs text-muted">{movie.watchRecords.length} 次观看</p>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Star
                        size={14}
                        className={
                          movie.rating == null ? 'text-muted' : 'fill-warning text-warning'
                        }
                        aria-hidden="true"
                      />
                      {movie.rating ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <span className="whitespace-nowrap text-xs">{movie.watchedOn ?? '—'}</span>
                  </Table.Cell>
                  <Table.Cell className="align-top">
                    <MovieRecordActions
                      movie={movie}
                      disabled={disabled}
                      onEdit={() => onEdit(movie)}
                      onDetails={() => onDetails(movie)}
                      onToggle={() => onToggle(movie)}
                      onObserve={() => onObserve(movie)}
                      onDelete={() => onDelete(movie)}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  )
}
