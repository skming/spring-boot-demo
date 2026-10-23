import {
  Button,
  Input,
  Chip,
  ListBox,
  Select,
  Label,
  Separator,
  Skeleton,
  Spinner,
  Surface,
  Tooltip,
  toast,
} from '@heroui/react'
import type { Selection } from '@heroui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/providers/auth-context'
import { getTable, listTables, runQuery } from '../api/labApi'
import type { SqlQueryResult, TableDetail, TableSummary } from '../types/lab'
import { SqlEditor } from '../components/SqlEditor'
import { SqlResultTable } from '../components/SqlResultTable'
import { SqlHistory } from '../components/SqlHistory'
import { CopyButton } from '../../../shared/components/CopyButton'
import {
  appendSqlHistory,
  filterResultRows,
  resultRowsJson,
  type SqlHistoryEntry,
} from '../workbench'
import { DEFAULT_SQL, buildSqlPresets } from '../sqlPresets'
import { sqlConfirmation, sqlResultFeedback } from '../sqlActions'
import { MAX_SQL_LENGTH, type SqlExecution } from '../sqlEditorActions'
import { Columns3, Database, Maximize2, Minimize2, RefreshCw, SquareTerminal } from 'lucide-react'
import { useConfirm } from '../../../app/providers/confirm-context'
import { useWatchStatuses } from '../../movie/hooks/useWatchStatuses'
import { watchStatusLabel } from '../../movie/movieView'
import type { WatchStatusOption } from '../../movie/types/movie'

type RunState = 'idle' | 'running' | 'success' | 'no-change' | 'audit-warning' | 'error'
type LabLocationState = { sql?: string } | null

export function LabPage() {
  const confirm = useConfirm()
  const location = useLocation()
  const incomingSql = (location.state as LabLocationState)?.sql?.trim()
  const { user } = useAuth()
  const { watchStatuses, refreshWatchStatuses } = useWatchStatuses()
  const sqlPresets = useMemo(() => buildSqlPresets(user?.userId), [user?.userId])

  const [tables, setTables] = useState<TableSummary[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>('movies')
  const [tableDetail, setTableDetail] = useState<TableDetail | null>(null)
  const [sql, setSql] = useState(incomingSql || DEFAULT_SQL)
  const [activePreset, setActivePreset] = useState<string | null>(incomingSql ? null : '查询列表')
  const [presetDrafts, setPresetDrafts] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SqlQueryResult | null>(null)
  const [loadingTables, setLoadingTables] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const [runState, setRunState] = useState<RunState>('idle')
  const [lastExecutedSql, setLastExecutedSql] = useState('')
  const [lastRunScope, setLastRunScope] = useState<SqlExecution['scope']>('all')
  const [editorExpanded, setEditorExpanded] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [metadataRevision, setMetadataRevision] = useState(0)
  const [tableSearch, setTableSearch] = useState('')
  const [resultSearch, setResultSearch] = useState('')
  const [history, setHistory] = useState<SqlHistoryEntry[]>([])
  const historyId = useRef(0)
  const visibleTables = tables.filter((table) =>
    table.tableName.toLowerCase().includes(tableSearch.trim().toLowerCase()),
  )
  const visibleRows = useMemo(
    () => (result ? filterResultRows(result, resultSearch) : []),
    [result, resultSearch],
  )
  const resultJson = useMemo(
    () => (result ? resultRowsJson(result.columns, visibleRows) : ''),
    [result, visibleRows],
  )

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await listTables()
        if (!cancelled) {
          setTables(data)
        }
      } catch (err) {
        if (!cancelled) {
          toast.danger('加载数据表失败', {
            description: err instanceof Error ? err.message : '请刷新重试',
          })
        }
      } finally {
        if (!cancelled) {
          setLoadingTables(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [metadataRevision])

  useEffect(() => {
    if (!selectedTable) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const detail = await getTable(selectedTable)
        if (!cancelled) {
          setTableDetail(detail)
          setLoadingDetail(false)
        }
      } catch (err) {
        if (!cancelled) {
          setTableDetail(null)
          setLoadingDetail(false)
          toast.danger('加载表结构失败', {
            description: err instanceof Error ? err.message : '请刷新重试',
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedTable, metadataRevision])

  const statusChip = useMemo(() => {
    if (runState === 'running') {
      return { color: 'accent' as const, label: '执行中' }
    }
    if (runState === 'error') {
      return { color: 'danger' as const, label: '失败 / 已拒绝' }
    }
    if (runState === 'audit-warning') {
      return { color: 'warning' as const, label: '已执行 · 日志未记录' }
    }
    if (runState === 'no-change') {
      return { color: 'warning' as const, label: '未影响记录' }
    }
    if (runState === 'success' && result?.truncated) {
      return { color: 'warning' as const, label: '成功 · 已截断' }
    }
    if (runState === 'success') {
      return { color: 'success' as const, label: '成功' }
    }
    return { color: 'accent' as const, label: '待执行' }
  }, [result?.truncated, runState])

  function currentDraftKey(preset: string | null): string {
    return preset ?? '__custom__'
  }

  function rememberCurrentDraft() {
    setPresetDrafts((current) => ({
      ...current,
      [currentDraftKey(activePreset)]: sql,
    }))
  }

  function loadPreset(label: string) {
    if (runningRef.current) return
    rememberCurrentDraft()
    if (label === '__custom__') {
      setActivePreset(null)
      setSql(presetDrafts['__custom__'] ?? '')
      setResult(null)
      setRunState('idle')
      return
    }
    const preset = sqlPresets.find((item) => item.label === label)
    if (!preset) {
      return
    }
    const draft = presetDrafts[label]
    setActivePreset(label)
    setSql(draft ?? preset.sql)
    setResult(null)
    setRunState('idle')
  }

  function handleSqlChange(next: string) {
    setSql(next)
    setPresetDrafts((current) => ({
      ...current,
      [currentDraftKey(activePreset)]: next,
    }))
  }

  async function resetActivePreset() {
    if (
      runningRef.current ||
      !(await confirm({
        title: '重置 SQL 模板？',
        description: '将覆盖当前编辑器内容；其他模板的草稿会保留。',
        confirmText: '重置模板',
      }))
    )
      return
    if (runningRef.current) return
    if (!activePreset) {
      setSql(DEFAULT_SQL)
      setActivePreset('查询列表')
      setPresetDrafts((current) => {
        const next = { ...current }
        delete next['__custom__']
        delete next['查询列表']
        return next
      })
    } else {
      const preset = buildSqlPresets(user?.userId).find((item) => item.label === activePreset)
      if (preset) {
        setSql(preset.sql)
        setPresetDrafts((current) => {
          const next = { ...current }
          delete next[activePreset]
          return next
        })
      }
    }
    setResult(null)
    setRunState('idle')
  }

  function handleTableSelection(keys: Selection) {
    if (keys === 'all') {
      return
    }
    const first = keys.values().next().value
    const next = first == null ? null : String(first)
    if (next === selectedTable) return
    setSelectedTable(next)
    setTableDetail(null)
    setLoadingDetail(next != null)
  }

  function fillSelectForTable(tableName: string) {
    if (runningRef.current) return
    const sqlText =
      tableName === 'movies'
        ? DEFAULT_SQL
        : tableName === 'users'
          ? `SELECT
  id,
  email,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 20`
          : tableName === 'operation_logs'
            ? `SELECT
  action,
  resource_type,
  detail,
  success,
  message,
  created_at
FROM operation_logs
ORDER BY created_at DESC
LIMIT 20`
            : `SELECT * FROM ${tableName} LIMIT 20`
    rememberCurrentDraft()
    const presetLabel =
      tableName === 'movies' ? '查询列表' : tableName === 'operation_logs' ? '查看操作日志' : null
    setSql(sqlText)
    setActivePreset(presetLabel)
    if (presetLabel) {
      setPresetDrafts((current) => ({ ...current, [presetLabel]: sqlText }))
    }
    setResult(null)
    setRunState('idle')
    toast.info(`已填入 ${tableName} 的示例查询`)
  }

  async function loadHistory(entry: SqlHistoryEntry) {
    if (runningRef.current || entry.sql === sql) return
    if (
      sql.trim() &&
      !(await confirm({
        title: '载入历史 SQL？',
        description: '将替换当前编辑器内容，不会自动执行。',
        confirmText: '载入',
      }))
    )
      return
    if (runningRef.current) return
    rememberCurrentDraft()
    setActivePreset(null)
    setSql(entry.sql)
    setResult(null)
    setResultSearch('')
    setRunState('idle')
  }

  function recordExecution(
    execution: SqlExecution,
    outcome: SqlHistoryEntry['outcome'],
    summary: string,
  ) {
    const entry: SqlHistoryEntry = {
      id: ++historyId.current,
      sql: execution.sql,
      scope: execution.scope,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      outcome,
      summary,
    }
    setHistory((entries) => appendSqlHistory(entries, entry))
  }

  async function handleRun(execution: SqlExecution) {
    if (runningRef.current || !execution.sql) {
      return
    }
    if (execution.sql.length > MAX_SQL_LENGTH) {
      toast.warning(`每次最多执行 ${MAX_SQL_LENGTH} 个字符`)
      return
    }
    // 确认弹框期间也锁定请求，避免快捷键重复触发并发执行。
    runningRef.current = true
    let requested = false
    try {
      const confirmation = sqlConfirmation(execution.sql)
      if (
        confirmation &&
        !(await confirm({
          title: '确认执行 SQL？',
          description: `${execution.scope === 'selection' ? '仅执行选中的 SQL 片段。' : '执行编辑器中的全部 SQL。'}${confirmation}`,
          confirmText: '执行 SQL',
          danger: true,
        }))
      )
        return
      setRunning(true)
      setRunState('running')
      setLastExecutedSql(execution.sourceSql)
      setLastRunScope(execution.scope)
      setResultSearch('')
      requested = true
      const data = await runQuery({ sql: execution.sql })
      const feedback = sqlResultFeedback(data)
      setResult(data)
      setRunState(feedback.state)
      recordExecution(
        execution,
        feedback.state === 'success' ? 'success' : 'warning',
        `${feedback.title} · ${feedback.countLabel} · ${data.durationMs} ms`,
      )
      const notify = feedback.state !== 'success' ? toast.warning : toast.success
      notify(feedback.title, { description: feedback.description })
    } catch (err) {
      setResult(null)
      const message = err instanceof Error ? err.message : '执行查询失败'
      setRunState('error')
      if (requested) recordExecution(execution, 'error', message)
      toast.danger('查询被拒绝或失败', { description: message })
    } finally {
      runningRef.current = false
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 xl:h-[calc(100dvh-7rem)] xl:min-h-[680px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border border-accent/25 bg-linear-to-r from-accent/12 via-surface to-success/8 px-4 py-4 shadow-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-10 items-center justify-center bg-accent text-accent-foreground">
            <Database size={21} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">数据库工作台</h1>
          <Chip color="accent" size="sm" variant="soft">
            <Chip.Label>受控 SQL</Chip.Label>
          </Chip>
          <Chip color={statusChip.color} size="sm" variant="soft">
            <Chip.Label>{statusChip.label}</Chip.Label>
          </Chip>
          {result ? (
            <span className="text-xs text-muted">
              {result.statementTypeLabel}
              {result.affectedRows != null
                ? ` · 影响 ${result.affectedRows} 行`
                : ` · ${result.rowCount} 行`}
              {` · ${result.durationMs} ms`}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="secondary"
                aria-label="刷新表结构"
                isPending={loadingTables || loadingDetail}
                isDisabled={running || loadingTables || loadingDetail}
                onPress={() => {
                  setLoadingTables(true)
                  setLoadingDetail(selectedTable != null)
                  setTableDetail(null)
                  setMetadataRevision((revision) => revision + 1)
                  refreshWatchStatuses()
                }}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>刷新表结构</Tooltip.Content>
          </Tooltip>
          <Button
            size="sm"
            variant="tertiary"
            className="xl:hidden"
            aria-expanded={showSchema}
            aria-controls="lab-schema"
            onPress={() => setShowSchema((value) => !value)}
          >
            表结构
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] xl:min-h-0 xl:flex-1 xl:grid-cols-[200px_minmax(0,1fr)_240px]">
        <Surface
          variant="secondary"
          className="flex max-h-[520px] min-h-0 flex-col overflow-hidden border border-accent/20 shadow-sm lg:max-h-none"
        >
          <div className="shrink-0 space-y-1 border-b border-accent/15 bg-accent/8 px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Database size={16} className="text-accent" aria-hidden="true" />
              数据表
            </p>
            <p className="text-[11px] text-muted">选择数据表以查看字段</p>
            <Input
              aria-label="查找数据表"
              placeholder="查找数据表…"
              variant="secondary"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              className="mt-2 w-full min-w-0 text-xs"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingTables ? <Skeleton className="h-20 w-full " /> : null}
            {!loadingTables && tables.length === 0 ? (
              <p className="px-2 text-sm text-muted">暂无可见表</p>
            ) : null}
            {!loadingTables && tables.length > 0 && !visibleTables.length ? (
              <p className="px-2 text-xs text-muted">没有匹配的数据表</p>
            ) : null}
            {visibleTables.length > 0 ? (
              <ListBox
                aria-label="数据表"
                selectedKeys={selectedTable ? new Set([selectedTable]) : new Set()}
                selectionMode="single"
                onSelectionChange={handleTableSelection}
              >
                {visibleTables.map((table) => (
                  <ListBox.Item
                    key={table.tableName}
                    id={table.tableName}
                    textValue={table.tableName}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono text-sm text-accent">{table.tableName}</span>
                      <span className="text-[10px] text-muted">{table.tableType}</span>
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            ) : null}
          </div>
          {selectedTable ? (
            <div className="shrink-0 border-t border-border/70 p-2">
              <Button
                fullWidth
                size="sm"
                variant="secondary"
                isDisabled={running}
                onPress={() => fillSelectForTable(selectedTable)}
              >
                填入示例 SQL
              </Button>
            </div>
          ) : null}
          <SqlHistory
            entries={history}
            disabled={running}
            onLoad={(entry) => void loadHistory(entry)}
            onClear={() => setHistory([])}
          />
        </Surface>

        <div
          className={`grid h-[840px] min-h-0 gap-3 xl:h-auto ${
            editorExpanded
              ? 'grid-rows-[minmax(420px,0.78fr)_minmax(160px,0.22fr)]'
              : 'grid-rows-[minmax(320px,0.58fr)_minmax(200px,0.42fr)]'
          }`}
        >
          <Surface className="flex min-h-0 flex-col overflow-hidden border border-accent/25 bg-surface shadow-sm">
            <div className="shrink-0 space-y-2 border-b border-accent/15 bg-linear-to-r from-accent/10 to-surface px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <SquareTerminal size={17} aria-hidden="true" />
                  SQL 编辑器
                </span>
                {activePreset ? (
                  <Chip color="accent" size="sm" variant="soft">
                    <Chip.Label>
                      {sqlPresets.find((item) => item.label === activePreset)?.hint ?? activePreset}
                    </Chip.Label>
                  </Chip>
                ) : (
                  <Chip size="sm" variant="soft">
                    <Chip.Label>自定义 SQL</Chip.Label>
                  </Chip>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label="SQL 示例模板"
                  className="min-w-40 flex-1"
                  variant="secondary"
                  value={activePreset ?? '__custom__'}
                  isDisabled={running}
                  onChange={(key) => {
                    if (key != null) loadPreset(String(key))
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="__custom__" textValue="自定义 SQL">
                        自定义 SQL
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {sqlPresets.map((preset) => (
                        <ListBox.Item key={preset.label} id={preset.label} textValue={preset.label}>
                          <Label>{preset.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Button
                  size="sm"
                  variant="tertiary"
                  isDisabled={running}
                  onPress={() => void resetActivePreset()}
                >
                  重置模板
                </Button>
                <Tooltip delay={300}>
                  <Tooltip.Trigger>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="secondary"
                      aria-label={editorExpanded ? '恢复编辑器布局' : '展开编辑器'}
                      aria-pressed={editorExpanded}
                      onPress={() => setEditorExpanded((expanded) => !expanded)}
                    >
                      {editorExpanded ? (
                        <Minimize2 size={14} aria-hidden="true" />
                      ) : (
                        <Maximize2 size={14} aria-hidden="true" />
                      )}
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {editorExpanded ? '恢复编辑器布局' : '展开编辑器'}
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-2">
              <SqlEditor
                value={sql}
                onChange={handleSqlChange}
                onRun={(execution) => void handleRun(execution)}
                tables={tables}
                table={tableDetail}
                watchStatuses={watchStatuses}
                readOnly={running}
              />
            </div>
          </Surface>

          <Surface
            className={[
              'flex min-h-0 flex-col overflow-hidden border shadow-sm',
              runState === 'no-change' ||
              runState === 'audit-warning' ||
              (runState === 'success' && result?.truncated)
                ? 'border-warning/40 bg-gradient-to-b from-warning/10 to-surface'
                : runState === 'success'
                  ? 'border-success/35 bg-gradient-to-b from-success/10 to-surface'
                  : 'border-border/80 bg-surface-secondary/60',
            ].join(' ')}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-success/8 px-3 py-3">
              <div className="flex items-center gap-2">
                <Columns3 size={17} className="text-success-soft-foreground" aria-hidden="true" />
                <span
                  className={[
                    'text-sm font-semibold',
                    runState === 'no-change' ||
                    runState === 'audit-warning' ||
                    (runState === 'success' && result?.truncated)
                      ? 'text-warning-soft-foreground'
                      : runState === 'success'
                        ? 'text-success'
                        : 'text-foreground',
                  ].join(' ')}
                >
                  查询结果
                </span>
                <Chip color={statusChip.color} size="sm" variant="soft">
                  <Chip.Label>{statusChip.label}</Chip.Label>
                </Chip>
                {result ? (
                  <span className="text-xs text-muted">
                    {lastRunScope === 'selection' ? '选中 SQL 的结果' : '全部 SQL 的结果'}
                  </span>
                ) : null}
                {result && sql.trim() !== lastExecutedSql.trim() ? (
                  <span className="text-xs text-warning-soft-foreground">
                    编辑器已修改 · 下方为上次执行结果
                  </span>
                ) : null}
              </div>
              {result ? (
                <div className="flex flex-wrap gap-1.5">
                  <Chip color="accent" size="sm" variant="soft">
                    <Chip.Label>{sqlResultFeedback(result).countLabel}</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft">
                    <Chip.Label>{result.durationMs} ms</Chip.Label>
                  </Chip>
                  {result.truncated ? (
                    <Chip color="warning" size="sm" variant="soft">
                      <Chip.Label>已截断</Chip.Label>
                    </Chip>
                  ) : null}
                </div>
              ) : null}
            </div>

            {result && !running ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
                <Input
                  aria-label="筛选当前结果"
                  placeholder="筛选当前结果…"
                  variant="secondary"
                  value={resultSearch}
                  onChange={(event) => setResultSearch(event.target.value)}
                  className="min-w-40 flex-1 text-sm"
                />
                <span role="status" className="text-xs text-muted">
                  显示 {visibleRows.length} / {result.rows.length} 行
                  {result.truncated ? '（仅已返回结果）' : ''}
                </span>
                <CopyButton value={resultJson} label="复制当前结果 JSON" />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto p-2">
              {running ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-accent">
                  <Spinner color="accent" size="sm" />
                  正在执行…
                </div>
              ) : null}

              {!running && !result ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted">
                  <Columns3 size={28} className="text-muted/60" aria-hidden="true" />
                  <p>执行 SQL 后在这里查看结果</p>
                </div>
              ) : null}

              {!running && result ? (
                <div className="space-y-2">
                  {result.truncated ? (
                    <div className=" border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                      结果已截断：可加 `LIMIT` 或缩小查询范围。
                    </div>
                  ) : null}

                  {resultSearch.trim() && !visibleRows.length ? (
                    <p role="status" className="p-4 text-sm text-muted">
                      当前结果没有匹配项，可清除筛选后查看全部已返回数据。
                    </p>
                  ) : (
                    <SqlResultTable
                      result={{ ...result, rows: visibleRows }}
                      label="查询结果"
                      renderCell={(column, value) => (
                        <ResultCell column={column} value={value} watchStatuses={watchStatuses} />
                      )}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </Surface>
        </div>

        <Surface
          id="lab-schema"
          variant="secondary"
          className={`${showSchema ? 'flex' : 'hidden'} max-h-96 min-h-0 flex-col overflow-hidden border border-success/25 shadow-sm lg:col-span-2 xl:col-span-1 xl:flex xl:max-h-none`}
        >
          <div className="shrink-0 space-y-1 border-b border-success/15 bg-success/10 px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-success-soft-foreground">
              <Columns3 size={16} aria-hidden="true" />
              {selectedTable ? `表结构 · ${selectedTable}` : '表结构'}
            </p>
            <p className="text-[11px] text-muted">主键 / 列 / 可空 / 索引</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!selectedTable ? <p className="text-sm text-muted">尚未选择表</p> : null}
            {loadingDetail ? <Skeleton className="h-36 w-full " /> : null}
            {tableDetail ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {tableDetail.primaryKeys.length > 0 ? (
                    tableDetail.primaryKeys.map((key) => (
                      <Chip key={key} color="accent" size="sm" variant="soft">
                        <Chip.Label>PK · {key}</Chip.Label>
                      </Chip>
                    ))
                  ) : (
                    <span className="text-xs text-muted">无主键</span>
                  )}
                </div>
                <Separator />
                <div className="space-y-1.5">
                  {tableDetail.columns.map((column) => (
                    <div
                      key={column.columnName}
                      className="flex items-center justify-between gap-2 bg-default/60 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-foreground">
                          {column.columnName}
                        </p>
                        <p className="font-mono text-[10px] text-muted">{column.dataType}</p>
                      </div>
                      <Chip
                        color={column.nullable ? 'warning' : 'success'}
                        size="sm"
                        variant="soft"
                      >
                        <Chip.Label>{column.nullable ? '可空' : '非空'}</Chip.Label>
                      </Chip>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium">索引</p>
                  {tableDetail.indexes.length === 0 ? (
                    <p className="text-xs text-muted">无索引信息</p>
                  ) : (
                    <ul className="space-y-1">
                      {tableDetail.indexes.map((index) => (
                        <li
                          key={index}
                          className=" bg-success-soft px-2 py-1 font-mono text-[11px] text-success-soft-foreground"
                        >
                          {index}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>
    </div>
  )
}

function ResultCell({
  column,
  value,
  watchStatuses,
}: {
  column: string
  value: unknown
  watchStatuses: WatchStatusOption[]
}) {
  if (value === null || value === undefined) {
    return <span className=" bg-default px-1.5 py-0.5 font-mono text-[11px] text-muted">NULL</span>
  }

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)

  if (column.toLowerCase() === 'watch_status') {
    if (text === 'WANT_TO_WATCH') {
      return (
        <span className=" bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent-soft-foreground">
          {watchStatusLabel(text, watchStatuses)} · {text}
        </span>
      )
    }
    if (text === 'WATCHED') {
      return (
        <span className=" bg-success-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-success-soft-foreground">
          {watchStatusLabel(text, watchStatuses)} · {text}
        </span>
      )
    }
  }

  if (column.toLowerCase().includes('email')) {
    return <span className="font-mono text-[11px] text-accent">{text}</span>
  }

  return <span className="font-mono text-[11px] text-foreground">{text}</span>
}
