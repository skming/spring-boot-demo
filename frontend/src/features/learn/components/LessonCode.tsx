import Editor, { type OnMount } from '@monaco-editor/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CopyButton } from '../../../shared/components/CopyButton'
import {
  formatLessonCode,
  LESSON_CODE_LINE_HEIGHT,
  LESSON_CODE_PADDING,
  lessonCodeHeight,
} from '../codeView'
import { useTheme } from 'next-themes'

export function LessonCode({
  filename,
  code,
  language = 'java',
}: {
  filename: string
  code: string
  language?: string
}) {
  const formattedCode = formatLessonCode(code, language)
  const { resolvedTheme } = useTheme()
  const [height, setHeight] = useState(() =>
    lessonCodeHeight(
      formattedCode.split(/\r\n|\r|\n/).length * LESSON_CODE_LINE_HEIGHT + LESSON_CODE_PADDING,
    ),
  )
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])
  const handleMount = useCallback<OnMount>((editor) => {
    cleanupRef.current?.()
    const syncHeight = () => setHeight(lessonCodeHeight(editor.getContentHeight()))
    const subscription = editor.onDidContentSizeChange(syncHeight)
    cleanupRef.current = () => subscription.dispose()
    syncHeight()
  }, [])
  return (
    <div className="min-w-0 overflow-hidden border border-accent/20 bg-surface shadow-sm transition-colors focus-within:border-accent/50 [&_.monaco-editor]:bg-surface! [&_.monaco-editor-background]:bg-surface! [&_.margin]:bg-surface-secondary/60! [&_.line-numbers]:text-muted!">
      <div className="flex items-center justify-between gap-3 border-b border-accent/15 bg-accent/5 px-4 py-2">
        <span
          className="min-w-0 truncate font-mono text-xs font-medium text-foreground"
          title={filename}
        >
          {filename}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
            {language === 'java' ? 'Java' : language.toUpperCase()} · 只读
          </span>
          <CopyButton value={formattedCode} label={`复制 ${filename} 代码`} />
        </div>
      </div>
      <Editor
        height={height}
        language={language}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        value={formattedCode}
        onMount={handleMount}
        options={{
          readOnly: true,
          domReadOnly: true,
          ariaLabel: `${filename} 只读代码`,
          fontSize: 14,
          lineHeight: LESSON_CODE_LINE_HEIGHT,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          padding: { top: LESSON_CODE_PADDING / 2, bottom: LESSON_CODE_PADDING / 2 },
          minimap: { enabled: false },
          automaticLayout: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 16,
          glyphMargin: false,
          folding: false,
          renderLineHighlight: 'none',
          wrappingIndent: 'indent',
          guides: { indentation: true, highlightActiveIndentation: false },
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: 'off',
          renderValidationDecorations: 'off',
          tabSize: language === 'json' ? 2 : 4,
          insertSpaces: true,
          detectIndentation: false,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
        loading={
          <pre
            aria-label={`${filename} 代码片段`}
            className="h-full overflow-auto whitespace-pre-wrap break-words bg-surface p-4 font-mono text-sm leading-6"
          >
            <code>{formattedCode}</code>
          </pre>
        }
      />
    </div>
  )
}
