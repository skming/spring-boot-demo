import { Card, Chip } from '@heroui/react'
import { Clapperboard, Star } from 'lucide-react'
import type { Movie } from '../types/movie'
import { MovieRecordActions } from './MovieRecordActions'

type MovieCardProps = {
  movie: Movie
  editing: boolean
  disabled: boolean
  onEdit: () => void
  onDetails: () => void
  onToggle: () => void
  onObserve: () => void
  onDelete: () => void
}

export function MovieCard({
  movie,
  editing,
  disabled,
  onEdit,
  onDetails,
  onToggle,
  onObserve,
  onDelete,
}: MovieCardProps) {
  const watched = movie.watchStatus === 'WATCHED'

  return (
    <Card
      className={`h-full gap-0 overflow-hidden border p-0 shadow-sm ${watched ? 'border-success/30' : 'border-accent/25'} ${editing ? 'ring-2 ring-accent' : ''}`}
    >
      <Card.Header
        className={`gap-3 border-b border-border/60 px-4 py-4 ${watched ? 'bg-linear-to-br from-success/12 to-surface' : 'bg-linear-to-br from-accent/10 to-surface'}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center ${watched ? 'bg-success-soft text-success-soft-foreground' : 'bg-accent-soft text-accent-soft-foreground'}`}
          >
            <Clapperboard size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <Card.Title
              title={movie.title}
              className="line-clamp-2 h-12 break-words text-base leading-6"
            >
              {movie.title}
            </Card.Title>
            <Card.Description
              title={movie.director ?? ''}
              className="line-clamp-1 h-5 break-words text-sm leading-5"
            >
              {movie.releaseYear != null && (
                <span aria-label="发行年份">{movie.releaseYear} · </span>
              )}
              {movie.director || '导演待补充'}
            </Card.Description>
          </div>
          <Chip size="sm" variant="soft" color={watched ? 'success' : 'accent'}>
            <Chip.Label>{movie.watchStatusLabel}</Chip.Label>
          </Chip>
        </div>
        <div
          role="group"
          aria-label="电影类型"
          className="flex min-h-8 flex-wrap content-start items-start gap-1.5"
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
                <Chip.Label className="whitespace-normal break-words">{genre}</Chip.Label>
              </Chip>
            ))
          ) : (
            <span className="text-xs text-muted">未分类</span>
          )}
        </div>
      </Card.Header>
      <Card.Content className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Star
              size={16}
              className={movie.rating == null ? 'text-muted' : 'fill-warning text-warning'}
              aria-hidden="true"
            />
            {movie.rating == null ? '尚未评分' : `${movie.rating} / 5`}
          </span>
          <span className="text-xs text-muted">{movie.watchRecords.length} 次观看</span>
        </div>
        <p className="text-xs text-muted">
          {movie.watchedOn ? `最近观影 ${movie.watchedOn}` : '尚未记录观看'}
        </p>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">电影备注</p>
          <p
            className={`line-clamp-3 whitespace-pre-wrap break-words border-l-2 border-accent/25 pl-3 text-sm leading-6 ${movie.notes ? '' : 'text-muted'}`}
          >
            {movie.notes || '暂无电影备注'}
          </p>
        </div>
      </Card.Content>
      <Card.Footer className="mt-auto justify-end gap-1 border-t border-border/60 bg-surface-secondary/40 px-4 py-3">
        <MovieRecordActions
          movie={movie}
          disabled={disabled}
          onEdit={onEdit}
          onDetails={onDetails}
          onToggle={onToggle}
          onObserve={onObserve}
          onDelete={onDelete}
        />
      </Card.Footer>
    </Card>
  )
}
