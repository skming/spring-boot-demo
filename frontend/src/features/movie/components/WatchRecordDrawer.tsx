import { Button, Drawer, Label, ListBox, Select, TextArea, TextField, toast } from '@heroui/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useConfirm } from '../../../app/providers/confirm-context'
import { localDate } from '../movieView'
import type { Movie, WatchRecord, WatchRecordInput } from '../types/movie'
import { MovieDatePicker } from './MovieDatePicker'
import { watchRecordSchema } from '../watchRecordSchema'

type Props = {
  movie: Movie
  saving: boolean
  onClose: () => void
  onMutate: (id: string, recordId: string | null, input: WatchRecordInput | null) => Promise<Movie>
}

const blank = (): WatchRecordInput => ({ watchedOn: localDate(), rating: null, notes: '' })
const inputOf = (record: WatchRecord): WatchRecordInput => ({
  watchedOn: record.watchedOn,
  rating: record.rating,
  notes: record.notes ?? '',
})

export function WatchRecordDrawer({ movie, saving, onClose, onMutate }: Props) {
  const confirm = useConfirm()
  const [recordId, setRecordId] = useState<string | null>(null)
  const [form, setForm] = useState(blank)
  const [baseline, setBaseline] = useState(form)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function discard() {
    return (
      !dirty ||
      (await confirm({
        title: '放弃未保存的观影记录？',
        description: '已填写的日期、评分和笔记尚未保存。',
        confirmText: '放弃修改',
      }))
    )
  }
  async function close() {
    if (!saving && (await discard())) onClose()
  }
  async function edit(record: WatchRecord | null) {
    if (saving || !(await discard())) return
    const next = record ? inputOf(record) : blank()
    setRecordId(record?.id ?? null)
    setForm(next)
    setBaseline(next)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const result = watchRecordSchema.safeParse(form)
    if (!result.success) {
      toast.warning(result.error.issues[0].message)
      return
    }
    try {
      await onMutate(movie.id, recordId, result.data)
      toast.success(recordId ? '观影记录已更新' : '已记录本次观影')
      onClose()
    } catch {
      /* Hook 统一显示错误，保留输入以供重试。 */
    }
  }
  async function remove(record: WatchRecord) {
    if (saving || !(await discard())) return
    if (
      !(await confirm({
        title: '删除这次观影？',
        description: `将删除 ${record.watchedOn} 的评分和笔记，不影响其他观看记录。删除最后一次观看后，电影将回到想看片单。`,
        confirmText: '删除这次观影',
        danger: true,
      }))
    )
      return
    try {
      await onMutate(movie.id, record.id, null)
      const next = blank()
      setRecordId(null)
      setForm(next)
      setBaseline(next)
      toast.success('本次观影已删除')
    } catch {
      /* Hook 显示错误。 */
    }
  }
  return (
    <Drawer.Backdrop
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled={saving}
      onOpenChange={(open) => {
        if (!open) void close()
      }}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog className="border-l border-accent/20 p-0 data-[placement=right]:w-full data-[placement=right]:max-w-full sm:data-[placement=right]:w-[480px]">
          <Drawer.CloseTrigger aria-label="关闭观影记录" isDisabled={saving} />
          <Drawer.Header className="border-b border-success/20 bg-success/8 px-5 py-5 pr-14">
            <Drawer.Heading className="text-xl font-semibold">
              《{movie.title}》的观影记录
            </Drawer.Heading>
            <p className="text-sm text-muted">
              已记录 {movie.watchRecords.length} 次观看，每次评分与笔记独立保存。
            </p>
          </Drawer.Header>
          <Drawer.Body className="m-0 space-y-6 px-5 py-5 text-foreground">
            <form
              id="watch-record-form"
              noValidate
              className="space-y-4"
              onSubmit={(event) => void submit(event)}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{recordId ? '编辑这次观影' : '记录新的观影'}</h2>
                {recordId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={saving}
                    onPress={() => void edit(null)}
                  >
                    新增一次
                  </Button>
                ) : null}
              </div>
              <MovieDatePicker
                value={form.watchedOn || null}
                disabled={saving}
                onChange={(date) => setForm({ ...form, watchedOn: date ?? '' })}
              />
              <Select
                value={form.rating == null ? 'unrated' : String(form.rating)}
                isDisabled={saving}
                variant="secondary"
                onChange={(value) => {
                  if (value != null)
                    setForm({ ...form, rating: value === 'unrated' ? null : Number(value) })
                }}
              >
                <Label>本次评分（选填）</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="unrated" textValue="尚未评分">
                      尚未评分
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <ListBox.Item key={rating} id={String(rating)} textValue={`${rating} 星`}>
                        {rating} 星<ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField isDisabled={saving} variant="secondary">
                <Label>本次观影笔记</Label>
                <TextArea
                  rows={4}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </TextField>
              {dirty ? (
                <p role="status" className="text-xs text-warning-soft-foreground">
                  有未保存的内容
                </p>
              ) : null}
            </form>
            <section aria-label="观影历史" className="border-t border-border pt-5">
              <h2 className="mb-3 font-semibold">观影历史</h2>
              {!movie.watchRecords.length ? (
                <p className="text-sm text-muted">尚未记录观看。</p>
              ) : (
                <ol className="divide-y divide-border">
                  {movie.watchRecords.map((record) => (
                    <li key={record.id} className="space-y-2 py-4">
                      <p className="text-sm font-medium">
                        {record.watchedOn}
                        <span className="ml-3 text-warning-soft-foreground">
                          {record.rating == null ? '未评分' : `${record.rating} / 5`}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                        {record.notes || '未填写笔记'}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={saving}
                          onPress={() => void edit(record)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          isDisabled={saving}
                          onPress={() => void remove(record)}
                        >
                          删除
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </Drawer.Body>
          <Drawer.Footer className="border-t border-border px-5 py-4">
            <Button variant="secondary" isDisabled={saving} onPress={() => void close()}>
              关闭
            </Button>
            <Button
              type="submit"
              form="watch-record-form"
              isPending={saving}
              isDisabled={saving || !form.watchedOn || (recordId != null && !dirty)}
            >
              {recordId ? '保存修改' : '记录本次观影'}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
