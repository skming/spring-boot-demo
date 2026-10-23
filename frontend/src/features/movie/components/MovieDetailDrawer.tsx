import { Button, Chip, Drawer } from '@heroui/react'
import type { Movie } from '../types/movie'

type Props = {
  movie: Movie
  disabled: boolean
  onClose: () => void
  onEdit: () => void
  onWatch: () => void
}

export function MovieDetailDrawer({ movie, disabled, onClose, onEdit, onWatch }: Props) {
  return (
    <Drawer.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog className="border-l border-accent/20 p-0 data-[placement=right]:w-full data-[placement=right]:max-w-full sm:data-[placement=right]:w-[560px]">
          <Drawer.CloseTrigger aria-label="关闭电影详情" />
          <Drawer.Header className="gap-2 border-b border-accent/15 bg-linear-to-br from-accent/12 to-surface px-5 py-5 pr-14">
            <p className="text-xs font-semibold text-accent">电影详情</p>
            <Drawer.Heading className="break-words text-xl font-semibold">
              {movie.title}
            </Drawer.Heading>
            <p className="break-words text-sm text-muted">
              {movie.releaseYear} · {movie.director}
            </p>
            <div role="group" aria-label="电影类型" className="flex flex-wrap gap-1.5">
              {movie.genres.map((genre) => (
                <Chip
                  key={genre}
                  size="sm"
                  variant="soft"
                  color="accent"
                  className="h-auto max-w-full"
                >
                  <Chip.Label className="whitespace-normal break-words">{genre}</Chip.Label>
                </Chip>
              ))}
            </div>
          </Drawer.Header>
          <Drawer.Body className="m-0 space-y-6 px-5 py-5 text-foreground">
            <section aria-label="电影备注" className="space-y-3">
              <h2 className="font-semibold">电影备注</h2>
              <p className="whitespace-pre-wrap break-words border-l-2 border-accent/25 pl-3 text-sm leading-7">
                {movie.notes || '暂无电影备注'}
              </p>
            </section>
            <section aria-label="观影信息" className="space-y-4 border-t border-border pt-5">
              <h2 className="font-semibold">观影信息</h2>
              <dl className="grid grid-cols-2 gap-4 bg-surface-secondary/60 p-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">状态</dt>
                  <dd className="mt-1">{movie.watchStatusLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">观看次数</dt>
                  <dd className="mt-1">{movie.watchRecords.length} 次观看</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">最近评分</dt>
                  <dd className="mt-1">
                    {movie.rating == null ? '尚未评分' : `${movie.rating} / 5`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">最近观影日期</dt>
                  <dd className="mt-1">{movie.watchedOn ?? '尚未记录'}</dd>
                </div>
              </dl>
              {movie.watchRecords.length ? (
                <ol aria-label="观影历史" className="divide-y divide-border">
                  {movie.watchRecords.map((record) => (
                    <li key={record.id} className="space-y-3 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <time dateTime={record.watchedOn} className="font-medium">
                          {record.watchedOn}
                        </time>
                        <span className="text-warning-soft-foreground">
                          {record.rating == null ? '未评分' : `${record.rating} / 5`}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">
                        {record.notes || '未填写观影笔记'}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">尚未记录观看。</p>
              )}
            </section>
          </Drawer.Body>
          <Drawer.Footer className="flex-wrap justify-end gap-2 border-t border-border bg-surface px-5 py-4">
            <Button variant="secondary" isDisabled={disabled} onPress={onEdit}>
              编辑电影
            </Button>
            <Button variant="primary" isDisabled={disabled} onPress={onWatch}>
              {movie.watchRecords.length ? '管理观影记录' : '记录观影'}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
