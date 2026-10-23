import Editor, { type OnMount } from '@monaco-editor/react'
import { Button, Spinner, Tooltip, toast } from '@heroui/react'
import { Play, Redo2, Undo2, WrapText } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TableDetail, TableSummary } from '../types/lab'
import type { WatchStatusOption } from '../../movie/types/movie'
import {
  MAX_SQL_LENGTH,
  sqlExecution,
  sqlSuggestions,
  type SqlExecution,
} from '../sqlEditorActions'
import { CopyButton } from '../../../shared/components/CopyButton'
import { useTheme } from 'next-themes'

type SqlEditorProps = {
  value: string
  onChange: (value: string) => void
  onRun: (execution: SqlExecution) => void
  tables: TableSummary[]
  table: TableDetail | null
  watchStatuses?: WatchStatusOption[]
  className?: string
  readOnly?: boolean
}

type CodeEditor = Parameters<OnMount>[0]

export function SqlEditor({
  value,
  onChange,
  onRun,
  tables,
  table,
  watchStatuses = [],
  className,
  readOnly = false,
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<CodeEditor | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const currentRef = useRef({ onRun, readOnly, tables, table, watchStatuses })
  const [ready, setReady] = useState(false)
  const [wrap, setWrap] = useState(true)
  const [cursor, setCursor] = useState({
    line: 1,
    column: 1,
    selectedText: null as string | null,
    canUndo: false,
    canRedo: false,
  })

  useEffect(() => {
    currentRef.current = { onRun, readOnly, tables, table, watchStatuses }
  }, [onRun, readOnly, tables, table, watchStatuses])
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      editorRef.current = null
    }
  }, [])

  const execute = useCallback(() => {
    const editor = editorRef.current
    if (!editor || currentRef.current.readOnly) return
    const model = editor.getModel()
    const selection = editor.getSelection()
    if (!model) return
    const selected = selection && !selection.isEmpty() ? model.getValueInRange(selection) : null
    const request = sqlExecution(model.getValue(), selected)
    if (!request.sql) return
    if (request.sql.length > MAX_SQL_LENGTH) {
      toast.warning(`每次最多执行 ${MAX_SQL_LENGTH} 个字符`, {
        description: '可以选中需要执行的一条 SQL。',
      })
      return
    }
    currentRef.current.onRun(request)
  }, [])

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      cleanupRef.current?.()
      editorRef.current = editor
      const syncCursor = () => {
        const model = editor.getModel()
        const selection = editor.getSelection()
        const position = editor.getPosition()
        setCursor({
          line: position?.lineNumber ?? 1,
          column: position?.column ?? 1,
          selectedText:
            model && selection && !selection.isEmpty() ? model.getValueInRange(selection) : null,
          canUndo: model?.canUndo() ?? false,
          canRedo: model?.canRedo() ?? false,
        })
      }
      const kind = monaco.languages.CompletionItemKind
      const provider = monaco.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: ['.'],
        provideCompletionItems(
          model: NonNullable<ReturnType<CodeEditor['getModel']>>,
          position: { lineNumber: number; column: number },
        ) {
          if (model !== editor.getModel()) return { suggestions: [] }
          const word = model.getWordUntilPosition(position)
          const prefix = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1)
          const qualifier = prefix.match(/([A-Za-z_][A-Za-z0-9_]*)\.$/)?.[1]
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: position.column,
          }
          const current = currentRef.current
          return {
            suggestions: sqlSuggestions(
              current.tables,
              current.table,
              qualifier,
              current.watchStatuses,
            ).map((item) => ({
              ...item,
              range,
              kind: {
                keyword: kind.Keyword,
                table: kind.Struct,
                column: kind.Field,
                value: kind.EnumMember,
              }[item.kind],
            })),
          }
        },
      })
      const action = editor.addAction({
        id: 'dblab.execute-sql',
        label: '执行选中 SQL / 全部 SQL',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: execute,
      })
      const cursorListener = editor.onDidChangeCursorSelection(syncCursor)
      const contentListener = editor.onDidChangeModelContent(syncCursor)
      cleanupRef.current = () => {
        provider.dispose()
        action.dispose()
        cursorListener.dispose()
        contentListener.dispose()
      }
      syncCursor()
      setReady(true)
      editor.focus()
    },
    [execute],
  )

  const request = sqlExecution(value, cursor.selectedText)
  const selected = request.scope === 'selection'
  const overLimit = request.sql.length > MAX_SQL_LENGTH
  const copyTarget = cursor.selectedText ?? value
  function getCopyText() {
    const editor = editorRef.current
    const selection = editor?.getSelection()
    const model = editor?.getModel()
    return model && selection && !selection.isEmpty()
      ? model.getValueInRange(selection)
      : (model?.getValue() ?? value)
  }

  function history(action: 'undo' | 'redo') {
    if (readOnly) return
    editorRef.current?.trigger('toolbar', action, null)
    editorRef.current?.focus()
  }

  return (
    <div
      className={['flex h-full min-h-0 flex-col overflow-hidden border border-accent/20', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        role="toolbar"
        aria-label="SQL 编辑操作"
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            isPending={readOnly}
            isDisabled={!ready || readOnly || !request.sql || overLimit}
            onPress={execute}
          >
            <Play size={14} aria-hidden="true" />
            {selected ? '执行选中' : '执行全部'}
          </Button>
          <span className="hidden text-[11px] text-muted sm:inline">⌘ / Ctrl + Enter</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="撤销"
                isDisabled={!ready || readOnly || !cursor.canUndo}
                onPress={() => history('undo')}
              >
                <Undo2 size={16} aria-hidden="true" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>撤销 · ⌘ / Ctrl + Z</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="重做"
                isDisabled={!ready || readOnly || !cursor.canRedo}
                onPress={() => history('redo')}
              >
                <Redo2 size={16} aria-hidden="true" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>重做</Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant={wrap ? 'secondary' : 'ghost'}
                aria-label={wrap ? '关闭自动换行' : '开启自动换行'}
                aria-pressed={wrap}
                onPress={() => setWrap((next) => !next)}
              >
                <WrapText size={16} aria-hidden="true" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{wrap ? '关闭自动换行' : '开启自动换行'}</Tooltip.Content>
          </Tooltip>
          <CopyButton
            value={copyTarget}
            label={selected ? '复制选中 SQL' : '复制全部 SQL'}
            getText={getCopyText}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-surface">
        <Editor
          height="100%"
          language="sql"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
          value={value}
          onChange={(next) => onChange(next ?? '')}
          onMount={handleMount}
          options={{
            readOnly,
            ariaLabel: 'SQL 编辑器',
            fontSize: 14,
            lineHeight: 22,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: wrap ? 'on' : 'off',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderLineHighlight: 'all',
            padding: { top: 14, bottom: 14 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            wordBasedSuggestions: 'off',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            lineNumbersMinChars: 3,
            folding: true,
            bracketPairColorization: { enabled: true },
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
          loading={
            <div
              role="status"
              className="flex h-full items-center justify-center gap-2 text-sm text-muted"
            >
              <Spinner size="sm" />
              正在加载编辑器…
            </div>
          }
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-surface-secondary px-3 py-1.5 text-[11px] text-muted">
        <span>
          行 {cursor.line}，列 {cursor.column}
          {selected ? ` · 已选 ${cursor.selectedText!.length} 字符` : ''}
        </span>
        <span className={overLimit ? 'text-danger' : ''}>
          {readOnly
            ? '执行中 · 暂时只读'
            : `${selected ? '选中' : '全文'} ${request.sql.length} / ${MAX_SQL_LENGTH} 字符`}
        </span>
        <span className="hidden xl:inline">表名 / 当前表字段补全 · Ctrl + Space</span>
      </div>
    </div>
  )
}
