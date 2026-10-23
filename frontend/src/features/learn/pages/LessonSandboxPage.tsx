import { Button, Chip, toast } from '@heroui/react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useConfirm } from '../../../app/providers/confirm-context'
import { http } from '../../../shared/api/http'
import { SqlEditor } from '../../lab/components/SqlEditor'
import { SqlResultTable } from '../../lab/components/SqlResultTable'
import { sqlConfirmation, sqlResultFeedback } from '../../lab/sqlActions'
import type { SqlExecution } from '../../lab/sqlEditorActions'
import type { SqlQueryResult } from '../../lab/types/lab'
import { LESSONS, type Lesson } from '../curriculum'

const TABLES = ['users', 'movies', 'watch_records'].map((tableName) => ({
  tableName,
  tableType: 'TABLE',
}))

export function LessonSandboxPage() {
  const { lessonId } = useParams()
  const lesson = LESSONS.find((item) => item.id === lessonId && item.language === 'sql')
  if (!lesson)
    return (
      <div className="space-y-3 py-10">
        <h1 className="text-xl font-bold">本课没有 SQL 实验</h1>
        <Link to="/learn" className="text-accent">
          返回课程目录
        </Link>
      </div>
    )
  return <Sandbox key={lesson.id} lesson={lesson} />
}

function Sandbox({ lesson }: { lesson: Lesson }) {
  const confirm = useConfirm()
  const [sql, setSql] = useState(lesson.code)
  const [result, setResult] = useState<SqlQueryResult | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function run(execution: SqlExecution) {
    if (lock.current || !execution.sql.trim()) return
    // 确认框出现期间也持有锁，快捷键和按钮不能同时发出两次写入。
    lock.current = true
    try {
      const description = sqlConfirmation(execution.sql)
      if (
        description &&
        !(await confirm({
          title: '执行样本 SQL？',
          description: `${description}仅影响你的独立教学样本。`,
          confirmText: '执行',
          danger: true,
        }))
      )
        return
      setBusy(true)
      const data = await http<SqlQueryResult>('/api/v1/learning/sandbox/query', {
        method: 'POST',
        body: { sql: execution.sql },
      })
      setResult(data)
      const feedback = sqlResultFeedback(data)
      const notify = feedback.state === 'success' ? toast.success : toast.warning
      notify(feedback.title, { description: feedback.description })
    } catch (error) {
      setResult(null)
      toast.danger('样本 SQL 执行失败', {
        description: error instanceof Error ? error.message : '请检查语句',
      })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  async function reset() {
    if (lock.current) return
    lock.current = true
    try {
      if (
        !(await confirm({
          title: '重置教学样本？',
          description:
            '只重建你的教学库中的 2 个示例用户、3 部电影、3 次观看。不会修改真实片单或其他人的样本。',
          confirmText: '重置样本',
          danger: true,
        }))
      )
        return
      setBusy(true)
      await http<void>('/api/v1/learning/sandbox/reset', { method: 'POST' })
      setResult(null)
      toast.success('教学样本已重置')
    } catch (error) {
      toast.danger('重置样本失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <div className="space-y-5">
      <header className="space-y-3 border border-accent/20 bg-accent/8 px-5 py-6">
        <Link to={`/learn/${lesson.id}`} className="text-sm text-accent">
          ← 返回第 {String(lesson.number).padStart(2, '0')} 课
        </Link>
        <h1 className="text-2xl font-bold">{lesson.title} · SQL 实验</h1>
        <p className="text-sm leading-7 text-muted">
          独立临时
          SQLite，每个登录用户的样本互相隔离。重启服务后重建；这里不连接真实用户、密码或电影数据。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant="soft" color="success">
            <Chip.Label>独立教学库</Chip.Label>
          </Chip>
          <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void reset()}>
            重置样本
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={busy}
            onPress={() => {
              setSql(lesson.code)
              setResult(null)
            }}
          >
            恢复本课 SQL
          </Button>
        </div>
      </header>
      <p className="text-sm leading-7 text-muted">
        初始样本：星际穿越观看两次（5 星、3 星），千与千寻未看，霸王别姬观看一次但未评分。示例用户 A
        的 ID 为 11111111-1111-4111-8111-111111111111。
      </p>
      <div className="h-[380px] border border-border bg-surface">
        <SqlEditor
          value={sql}
          onChange={setSql}
          onRun={(execution) => void run(execution)}
          readOnly={busy}
          tables={TABLES}
          table={null}
        />
      </div>
      <section aria-label="SQL 实验结果" className="border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">
          {busy ? '执行中…' : result ? sqlResultFeedback(result).title : '实验结果'}
        </h2>
        {result ? (
          <>
            <p role="status" className="mb-3 text-xs text-muted">
              {sqlResultFeedback(result).description}
              {result.truncated ? ' · 返回结果已截断' : ''}
            </p>
            <SqlResultTable result={result} label="教学 SQL 查询结果" />
          </>
        ) : (
          <p className="text-sm text-muted">
            先预测结果，再执行 SQL。发生错误时通过通知显示，不会保留上一条成功结果。
          </p>
        )}
      </section>
    </div>
  )
}
