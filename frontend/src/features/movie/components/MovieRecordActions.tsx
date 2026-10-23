import { Button, Dropdown, Label, Tooltip } from '@heroui/react'
import { Clapperboard, Eye, MoreHorizontal, Pencil, SquareTerminal, Trash2 } from 'lucide-react'
import type { Movie } from '../types/movie'
import { CopyButton } from '../../../shared/components/CopyButton'

export type MovieRecordActionsProps = {
  movie: Movie
  disabled: boolean
  onEdit: () => void
  onDetails: () => void
  onToggle: () => void
  onObserve: () => void
  onDelete: () => void
}

export function MovieRecordActions({
  movie,
  disabled,
  onEdit,
  onDetails,
  onToggle,
  onObserve,
  onDelete,
}: MovieRecordActionsProps) {
  const actions = [
    { label: '查看详情', icon: Eye, onPress: onDetails },
    { label: '编辑电影', icon: Pencil, onPress: onEdit },
    {
      label: movie.watchStatus === 'WATCHED' ? '再看一次' : '记录观影',
      icon: Clapperboard,
      onPress: onToggle,
    },
  ]
  return (
    <div
      role="group"
      aria-label="电影操作"
      className="flex shrink-0 flex-nowrap items-center justify-end gap-1"
    >
      {actions.map(({ label, icon: Icon, onPress }) => (
        <Tooltip key={label} delay={300}>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={label}
              isDisabled={disabled}
              className="shrink-0"
              onPress={onPress}
            >
              <Icon size={16} className="shrink-0" aria-hidden="true" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
      ))}
      <CopyButton value={movie.id} label="复制记录 ID" />
      <Dropdown>
        <Dropdown.Trigger
          aria-label="更多电影操作"
          isDisabled={disabled}
          className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors hover:bg-default hover:text-foreground data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus disabled:opacity-50"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-40">
          <Dropdown.Menu
            aria-label="电影更多操作"
            disabledKeys={disabled ? ['sql', 'delete'] : []}
            onAction={(key) => {
              if (key === 'sql') onObserve()
              if (key === 'delete') onDelete()
            }}
          >
            <Dropdown.Item id="sql" textValue="查看 SQL">
              <SquareTerminal size={16} aria-hidden="true" />
              <Label>查看 SQL</Label>
            </Dropdown.Item>
            <Dropdown.Item id="delete" textValue="删除电影" variant="danger">
              <Trash2 size={16} aria-hidden="true" className="text-danger" />
              <Label>删除电影</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  )
}
