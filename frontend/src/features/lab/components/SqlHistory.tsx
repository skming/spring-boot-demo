import { Button, Tooltip } from '@heroui/react'
import { History, Trash2 } from 'lucide-react'
import type { SqlHistoryEntry } from '../workbench'

export function SqlHistory({
  entries,
  disabled,
  onLoad,
  onClear,
}: {
  entries: SqlHistoryEntry[]
  disabled: boolean
  onLoad: (entry: SqlHistoryEntry) => void
  onClear: () => void
}) {
  return (
    <section aria-label="最近执行记录" className="flex min-h-0 flex-col border-t border-accent/15">
      <div className="flex items-center justify-between gap-2 bg-accent/8 px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History size={16} aria-hidden="true" />
          最近执行
        </h2>
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="清空执行记录"
              isDisabled={disabled || !entries.length}
              onPress={onClear}
            >
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>清空执行记录</Tooltip.Content>
        </Tooltip>
      </div>
      <p className="px-3 py-2 text-[11px] text-muted">仅保留本页最近 20 次 · 点击载入，不会执行</p>
      <ol className="max-h-56 space-y-1 overflow-y-auto px-2 pb-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Button
              fullWidth
              variant="ghost"
              className="h-auto justify-start px-2 py-2 text-left"
              isDisabled={disabled}
              aria-label={`载入 SQL：${entry.sql}`}
              onPress={() => onLoad(entry)}
            >
              <span className="block min-w-0 w-full space-y-1">
                <span className="flex items-center justify-between gap-1 text-[10px] text-muted">
                  <time>{entry.time}</time>
                  <span>{entry.scope === 'selection' ? '选中' : '全文'}</span>
                </span>
                <span className="block truncate font-mono text-xs" title={entry.sql}>
                  {entry.sql.replace(/\s+/g, ' ')}
                </span>
                <span
                  className={`block truncate text-[11px] ${entry.outcome === 'error' ? 'text-danger' : entry.outcome === 'warning' ? 'text-warning-soft-foreground' : 'text-success-soft-foreground'}`}
                  title={entry.summary}
                >
                  {entry.summary}
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ol>
      {!entries.length ? <p className="px-3 pb-3 text-xs text-muted">暂无执行记录</p> : null}
    </section>
  )
}
