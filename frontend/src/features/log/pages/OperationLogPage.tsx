import { Button, Chip, Pagination, Skeleton, Surface, Table, Tooltip, toast } from '@heroui/react'
import type { Selection } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchOperationLogStats, listOperationLogs } from '../api/operationLogApi'
import type { OperationLog, OperationLogStats } from '../types/operationLog'
import { formatLogDetail, previewLogDetail } from '../logDetail'
import { CopyButton } from '../../../shared/components/CopyButton'
import { RefreshCw } from 'lucide-react'

const PAGE_SIZE = 10

type LogRow = {
  id: string
  kind: 'summary' | 'detail'
  log: OperationLog
  children: LogRow[]
}

type StatusFilter = 'ALL' | 'SUCCESS' | 'FAILED'

function actionTone(action: string): 'accent' | 'success' | 'warning' | 'danger' {
  if (action.startsWith('AUTH_')) {
    return 'accent'
  }
  if (action.includes('CREATE') || action.includes('INSERT')) {
    return 'success'
  }
  if (action.includes('UPDATE') || action.includes('LAB_SQL')) {
    return 'warning'
  }
  if (action.includes('DELETE')) {
    return 'danger'
  }
  return 'accent'
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    AUTH_REGISTER: '注册',
    AUTH_LOGIN: '登录',
    MOVIE_CREATE: '添加电影',
    MOVIE_UPDATE: '更新电影',
    MOVIE_DELETE: '删除电影',
    WATCH_CREATE: '记录观影',
    WATCH_UPDATE: '编辑本次观影',
    WATCH_DELETE: '删除本次观影',
    LAB_SQL: 'Lab SQL',
    LEARN_SQL: '教学 SQL',
  }
  return map[action] ?? action
}

function successParam(filter: StatusFilter): boolean | undefined {
  if (filter === 'SUCCESS') {
    return true
  }
  if (filter === 'FAILED') {
    return false
  }
  return undefined
}

function buildPageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  if (current <= 3) {
    return [1, 2, 3, 4, 'ellipsis', total]
  }
  if (current >= total - 2) {
    return [1, 'ellipsis', total - 3, total - 2, total - 1, total]
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total]
}

export function OperationLogPage() {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [stats, setStats] = useState<OperationLogStats>({ total: 0, success: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Selection>(() => new Set())

  const loadPage = useCallback(async (nextPage: number, nextFilter: StatusFilter) => {
    setLoading(true)
    try {
      const [pageData, statsData] = await Promise.all([
        listOperationLogs({
          page: nextPage,
          size: PAGE_SIZE,
          success: successParam(nextFilter),
        }),
        fetchOperationLogStats(),
      ])
      setLogs(pageData.content)
      setPage(pageData.page)
      setTotalPages(Math.max(pageData.totalPages, 0))
      setTotalElements(pageData.totalElements)
      setStats(statsData)
      setExpandedKeys(new Set())
    } catch (err) {
      toast.danger('加载操作日志失败', {
        description: err instanceof Error ? err.message : '请稍后刷新重试',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [pageData, statsData] = await Promise.all([
          listOperationLogs({ page: 0, size: PAGE_SIZE }),
          fetchOperationLogStats(),
        ])
        if (!cancelled) {
          setLogs(pageData.content)
          setPage(pageData.page)
          setTotalPages(Math.max(pageData.totalPages, 0))
          setTotalElements(pageData.totalElements)
          setStats(statsData)
        }
      } catch (err) {
        if (!cancelled) {
          toast.danger('加载操作日志失败', {
            description: err instanceof Error ? err.message : '请稍后刷新重试',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo<LogRow[]>(
    () =>
      logs.map((log) => ({
        id: log.id,
        kind: 'summary',
        log,
        children: [
          {
            id: `${log.id}-detail`,
            kind: 'detail',
            log,
            children: [],
          },
        ],
      })),
    [logs],
  )

  const uiPage = page + 1
  const pageNumbers = useMemo(
    () => buildPageNumbers(uiPage, Math.max(totalPages, 1)),
    [totalPages, uiPage],
  )
  const rangeStart = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, totalElements)

  function changeFilter(next: StatusFilter) {
    setFilter(next)
    void loadPage(0, next)
  }

  function changePage(nextUiPage: number) {
    const nextPage = Math.max(nextUiPage - 1, 0)
    void loadPage(nextPage, filter)
  }

  const renderExpandableRow = (item: LogRow) => {
    if (item.kind === 'detail') {
      return (
        <Table.Row id={item.id} textValue={`${item.log.action}-detail`}>
          <Table.Cell colSpan={5} className="p-0">
            <div className="min-w-0 space-y-3 border-y border-accent/15 bg-surface-secondary/60 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-x-5 gap-y-2 break-all text-xs text-muted">
                <span>资源类型：{item.log.resourceType}</span>
                {item.log.resourceId ? (
                  <span>
                    资源 ID：
                    <code className="ml-1 bg-default px-1.5 py-0.5 font-mono text-[11px]">
                      {item.log.resourceId}
                    </code>
                  </span>
                ) : null}
                {item.log.message ? <span>结果：{item.log.message}</span> : null}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span>操作详情</span>
                <CopyButton
                  value={item.log.detail ? formatLogDetail(item.log.detail) : ''}
                  label="复制操作详情"
                />
              </div>
              <pre className="max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-all border border-border bg-surface p-4 font-mono text-xs leading-6">
                {formatLogDetail(item.log.detail)}
              </pre>
            </div>
          </Table.Cell>
          <Table.Collection items={item.children}>{renderExpandableRow}</Table.Collection>
        </Table.Row>
      )
    }

    const log = item.log
    return (
      <Table.Row id={item.id} textValue={log.action}>
        <Table.Cell textValue={actionLabel(log.action)}>
          {({ hasChildItems, isDisabled, isExpanded, isTreeColumn }) => (
            <span className="flex items-center gap-1">
              {hasChildItems && isTreeColumn ? (
                <Button
                  isIconOnly
                  aria-label="展开详情"
                  isDisabled={isDisabled}
                  size="sm"
                  slot="chevron"
                  variant="ghost"
                >
                  <span
                    aria-hidden
                    className={[
                      'inline-block text-muted transition-transform duration-150',
                      isExpanded ? 'rotate-90' : '',
                    ].join(' ')}
                  >
                    ▸
                  </span>
                </Button>
              ) : null}
              <Chip color={actionTone(log.action)} size="sm" variant="soft">
                <Chip.Label>{actionLabel(log.action)}</Chip.Label>
              </Chip>
            </span>
          )}
        </Table.Cell>
        <Table.Cell>
          <Chip color={log.success ? 'success' : 'danger'} size="sm" variant="soft">
            <Chip.Label>{log.success ? '成功' : '失败'}</Chip.Label>
          </Chip>
        </Table.Cell>
        <Table.Cell>
          <span className="text-xs text-muted">{log.resourceType}</span>
        </Table.Cell>
        <Table.Cell>
          <span className="font-mono text-[11px] text-muted">{previewLogDetail(log.detail)}</span>
        </Table.Cell>
        <Table.Cell>
          <time className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</time>
        </Table.Cell>
        <Table.Collection items={item.children}>{renderExpandableRow}</Table.Collection>
      </Table.Row>
    )
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">操作日志</h1>
            <Chip color="accent" size="sm" variant="soft">
              <Chip.Label>每页 {PAGE_SIZE} 条</Chip.Label>
            </Chip>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted">支持服务端分页与成功/失败筛选。</p>
        </div>
        <Tooltip delay={300}>
          <Tooltip.Trigger>
            <Button
              isIconOnly
              size="sm"
              variant="secondary"
              aria-label="刷新操作日志"
              isPending={loading}
              isDisabled={loading}
              onPress={() => void loadPage(page, filter)}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>刷新操作日志</Tooltip.Content>
        </Tooltip>
      </section>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            {
              key: 'ALL' as const,
              label: '全部',
              value: stats.total,
              className: 'bg-surface-secondary',
            },
            {
              key: 'SUCCESS' as const,
              label: '成功',
              value: stats.success,
              className: 'bg-success-soft',
            },
            {
              key: 'FAILED' as const,
              label: '失败',
              value: stats.failed,
              className: 'bg-danger-soft',
            },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className={[
              'px-3 py-2.5 text-left transition ring-offset-2 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              item.className,
              filter === item.key ? 'ring-2 ring-accent' : '',
            ].join(' ')}
            onClick={() => changeFilter(item.key)}
          >
            <p className="text-[11px] text-muted">{item.label}</p>
            <p className="mt-0.5 text-xl font-semibold">{item.value}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {!loading && logs.length === 0 ? (
        <Surface
          variant="secondary"
          className="border border-dashed border-border px-6 py-10 text-center"
        >
          <p className="text-sm text-muted">暂无日志。去观影页或工作台操作后回来刷新。</p>
        </Surface>
      ) : null}

      {!loading && rows.length > 0 ? (
        <Surface variant="secondary" className="space-y-3 border border-border/80 p-2">
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="操作日志"
                className="min-w-[760px]"
                expandedKeys={expandedKeys}
                treeColumn="action"
                onExpandedChange={setExpandedKeys}
              >
                <Table.Header>
                  <Table.Column id="action" isRowHeader>
                    动作
                  </Table.Column>
                  <Table.Column id="status">状态</Table.Column>
                  <Table.Column id="resource">资源</Table.Column>
                  <Table.Column id="preview">摘要</Table.Column>
                  <Table.Column id="time">时间</Table.Column>
                </Table.Header>
                <Table.Body items={rows} dependencies={[expandedKeys]}>
                  {renderExpandableRow}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Pagination className="justify-between gap-3 px-2 py-2" size="sm">
            <Pagination.Summary>
              第 {rangeStart}-{rangeEnd} 条，共 {totalElements} 条
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page <= 0 || loading}
                  onPress={() => changePage(uiPage - 1)}
                >
                  <Pagination.PreviousIcon />
                  <span>上一页</span>
                </Pagination.Previous>
              </Pagination.Item>
              {pageNumbers.map((item, index) =>
                item === 'ellipsis' ? (
                  <Pagination.Item key={`e-${index}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={item}>
                    <Pagination.Link isActive={item === uiPage} onPress={() => changePage(item)}>
                      {item}
                    </Pagination.Link>
                  </Pagination.Item>
                ),
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={totalPages === 0 || page >= totalPages - 1 || loading}
                  onPress={() => changePage(uiPage + 1)}
                >
                  <span>下一页</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Surface>
      ) : null}
    </div>
  )
}
