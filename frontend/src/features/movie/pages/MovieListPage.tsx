import {
  Button,
  Card,
  Drawer,
  Input,
  Label,
  ListBox,
  Select,
  Skeleton,
  TextField,
  toast,
} from '@heroui/react'
import { Clapperboard, LayoutGrid, List, Plus, RefreshCw, Shuffle, Star } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMovies } from '../hooks/useMovies'
import { useWatchStatuses } from '../hooks/useWatchStatuses'
import type { Movie, MovieInput, WatchStatus } from '../types/movie'
import {
  EMPTY_MOVIE,
  isMovieInputDirty,
  movieStats,
  movieToInput,
  pickMovie,
  watchStatusLabel,
} from '../movieView'
import { WatchRecordDrawer } from '../components/WatchRecordDrawer'
import { MovieForm } from '../components/MovieForm'
import { movieInputSchema } from '../movieSchema'
import { MovieCard } from '../components/MovieCard'
import { MovieDetailDrawer } from '../components/MovieDetailDrawer'
import { MovieListView } from '../components/MovieListView'
import { useConfirm } from '../../../app/providers/confirm-context'

export function MovieListPage() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { movies, loading, loaded, saving, create, update, remove, refresh, mutateWatch } =
    useMovies()
  const { watchStatuses, loadingWatchStatuses, refreshWatchStatuses } = useWatchStatuses()
  const [form, setForm] = useState<MovieInput>(EMPTY_MOVIE)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<'updatedAt' | 'rating' | 'title'>('updatedAt')
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [watchingId, setWatchingId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailMovie = movies.find((movie) => movie.id === detailId)
  const watchingMovie = movies.find((movie) => movie.id === watchingId)
  const stats = useMemo(() => movieStats(movies), [movies])
  const picked = movies.find(
    (movie) => movie.id === pickedId && movie.watchStatus === 'WANT_TO_WATCH',
  )
  const editingMovie = movies.find((movie) => movie.id === editingId) ?? null
  const dirty = isMovieInputDirty(form, editingMovie)
  useEffect(() => {
    if (!dirty) return
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])
  const visibleMovies = useMemo(() => {
    const search = keyword.trim().toLowerCase()
    return movies
      .filter(
        (movie) =>
          (statusFilter === 'ALL' || movie.watchStatus === statusFilter) &&
          [
            movie.title,
            movie.director ?? '',
            ...movie.genres,
            movie.notes ?? '',
            ...movie.watchRecords.map((record) => record.notes ?? ''),
            movie.id,
          ].some((text) => text.toLowerCase().includes(search)),
      )
      .sort((a, b) =>
        sortKey === 'title'
          ? a.title.localeCompare(b.title, 'zh-CN')
          : sortKey === 'rating'
            ? (b.rating ?? 0) - (a.rating ?? 0)
            : b.updatedAt.localeCompare(a.updatedAt),
      )
  }, [movies, keyword, statusFilter, sortKey])

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_MOVIE)
  }

  async function confirmDiscard() {
    return (
      !dirty ||
      (await confirm({
        title: '放弃未保存的内容？',
        description: '当前修改尚未保存，继续后将丢失这些修改。',
        confirmText: '放弃修改',
      }))
    )
  }

  async function openEditor(movie: Movie | null) {
    if (saving || (formOpen && !(await confirmDiscard()))) return
    setDetailId(null)
    setEditingId(movie?.id ?? null)
    setForm(movie ? movieToInput(movie) : EMPTY_MOVIE)
    setFormOpen(true)
  }

  async function closeEditor() {
    if (saving || !(await confirmDiscard())) return
    setFormOpen(false)
    resetForm()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const result = movieInputSchema.safeParse(form)
    if (!result.success) {
      toast.warning(result.error.issues[0].message)
      return
    }
    const input = result.data
    try {
      if (editingId) await update(editingId, input)
      else await create(input)
      toast.success(editingId ? '电影资料已更新' : '已加入片单')
      resetForm()
      setFormOpen(false)
    } catch {
      /* Hook 展示服务器错误。 */
    }
  }

  async function toggleWatched(movie: Movie) {
    if (saving) return
    if (formOpen && !(await confirmDiscard())) return
    setFormOpen(false)
    resetForm()
    setDetailId(null)
    setWatchingId(movie.id)
  }

  async function openDetails(movie: Movie) {
    if (saving || (formOpen && !(await confirmDiscard()))) return
    setFormOpen(false)
    resetForm()
    setDetailId(movie.id)
  }

  async function deleteRecord(movie: Movie) {
    if (editingId === movie.id && !(await confirmDiscard())) return
    if (
      saving ||
      !(await confirm({
        title: '删除电影？',
        description: `将删除《${movie.title}》及全部 ${movie.watchRecords.length} 次观影记录，无法撤销。`,
        confirmText: '删除电影',
        danger: true,
      }))
    )
      return
    try {
      await remove(movie.id)
      if (editingId === movie.id) resetForm()
      toast.success('电影已删除')
    } catch {
      /* Hook 展示服务器错误。 */
    }
  }

  function chooseTonight() {
    const movie = pickMovie(movies, pickedId)
    if (!movie) {
      toast.info('先添加一部想看的电影，再来抽选')
      return
    }
    setPickedId(movie.id)
  }

  async function observeSql(movie: Movie) {
    if (!(await confirmDiscard())) return
    navigate('/lab', {
      state: {
        sql: `SELECT m.title, w.id, w.watched_on, w.rating, w.notes\nFROM movies m\nLEFT JOIN watch_records w ON w.movie_id = m.id\nWHERE m.id = '${movie.id}'\nORDER BY w.watched_on DESC, w.created_at DESC`,
      },
    })
  }

  return (
    <div className="space-y-5">
      <section className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden border border-accent/20 bg-linear-to-br from-accent/15 via-surface to-success/10 p-5 sm:p-7">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
            <Clapperboard size={18} aria-hidden="true" /> DB Lab · 放映室
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">我的观影手账</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            管理想看的电影，记录评分、日期与观影笔记。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="shadow-sm"
            isDisabled={loading || saving}
            onPress={() => void openEditor(null)}
          >
            <Plus size={17} aria-hidden="true" />
            添加电影
          </Button>
          <Button
            variant="secondary"
            isDisabled={loading || saving || stats.wanted === 0}
            onPress={chooseTonight}
          >
            <Shuffle size={17} aria-hidden="true" />
            今晚看什么？
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: '全部电影',
            value: stats.total,
            filter: 'ALL' as const,
            tone: 'border-border bg-surface',
          },
          {
            label: watchStatusLabel('WANT_TO_WATCH', watchStatuses),
            value: stats.wanted,
            filter: 'WANT_TO_WATCH' as const,
            tone: 'border-accent/20 bg-accent-soft',
          },
          {
            label: watchStatusLabel('WATCHED', watchStatuses),
            value: stats.watched,
            filter: 'WATCHED' as const,
            tone: 'border-success/25 bg-success-soft',
          },
        ].map((item) => (
          <Button
            key={item.filter}
            fullWidth
            variant="ghost"
            className={`h-24 min-w-0 justify-start border px-4 shadow-sm ${item.tone} ${statusFilter === item.filter ? 'border-accent ring-1 ring-inset ring-accent' : ''}`}
            aria-pressed={statusFilter === item.filter}
            onPress={() => setStatusFilter(item.filter)}
          >
            <span className="space-y-1 text-left">
              <span className="block text-xs text-muted">{item.label}</span>
              <span className="block text-2xl font-semibold text-foreground">{item.value}</span>
            </span>
          </Button>
        ))}
        <Card className="h-24 min-w-0 justify-center gap-0 border border-warning/25 bg-warning-soft shadow-sm">
          <Card.Content className="flex-none gap-1">
            <p className="flex items-center gap-1 text-xs text-muted">
              <Star
                size={13}
                className={stats.averageRating == null ? 'text-muted' : 'fill-warning text-warning'}
                aria-hidden="true"
              />
              观影 {stats.viewings} 次 · 平均评分
            </p>
            <p className="text-2xl font-semibold">
              {stats.averageRating == null ? '—' : `${stats.averageRating.toFixed(1)} / 5`}
            </p>
          </Card.Content>
        </Card>
      </div>

      {picked ? (
        <Card className="border border-accent/30 bg-accent-soft" aria-label="今晚的片单抽选结果">
          <Card.Header>
            <Card.Title>今晚推荐：《{picked.title}》</Card.Title>
            <Card.Description>
              {picked.genres.join(' / ') || '未分类'} · {picked.director || '导演待补充'}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <p role="status">{picked.notes || '看完后，留下一句话给未来的自己。'}</p>
          </Card.Content>
          <Card.Footer className="flex-wrap gap-2">
            <Button size="sm" variant="secondary" isDisabled={saving} onPress={chooseTonight}>
              换一部
            </Button>
            <Button size="sm" isDisabled={saving} onPress={() => void toggleWatched(picked)}>
              今天看完了
            </Button>
            <Button size="sm" variant="tertiary" onPress={() => setPickedId(null)}>
              收起
            </Button>
          </Card.Footer>
        </Card>
      ) : null}

      <section className="space-y-3" aria-label="观影记录列表">
        <div className="space-y-3 border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clapperboard size={18} className="text-accent" aria-hidden="true" />
              我的片单{' '}
              <span className="text-sm font-normal text-muted">{visibleMovies.length} 部</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="片单显示模式"
                className="flex gap-1 border border-border bg-surface-secondary p-1"
              >
                <Button
                  size="sm"
                  variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                  aria-pressed={viewMode === 'cards'}
                  onPress={() => setViewMode('cards')}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  卡片
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  aria-pressed={viewMode === 'list'}
                  onPress={() => setViewMode('list')}
                >
                  <List size={14} aria-hidden="true" />
                  列表
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <TextField className="min-w-48 flex-1" variant="secondary">
              <Label>搜索电影</Label>
              <Input
                value={keyword}
                placeholder="片名 / 导演 / 类型 / 笔记"
                onChange={(event) => setKeyword(event.target.value)}
              />
            </TextField>
            <Select
              className="w-36"
              variant="secondary"
              value={sortKey}
              onChange={(key) => {
                if (key === 'updatedAt' || key === 'rating' || key === 'title') setSortKey(key)
              }}
            >
              <Label>排序</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="updatedAt" textValue="最近更新">
                    最近更新
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="rating" textValue="评分最高">
                    评分最高
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="title" textValue="片名">
                    片名
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <Button
              variant="secondary"
              isDisabled={saving || loading || loadingWatchStatuses}
              onPress={() => {
                refreshWatchStatuses()
                void refresh()
              }}
            >
              <RefreshCw size={15} aria-hidden="true" />
              刷新
            </Button>
            <Button
              variant="tertiary"
              onPress={() => {
                setKeyword('')
                setStatusFilter('ALL')
                setSortKey('updatedAt')
              }}
            >
              重置筛选
            </Button>
          </div>
          <p className="text-xs text-muted">
            {statusFilter === 'ALL' ? '全部电影' : watchStatusLabel(statusFilter, watchStatuses)} ·
            点击上方统计可切换筛选
          </p>
        </div>
        {loading ? <Skeleton className="h-40 w-full" /> : null}
        {!loading && !visibleMovies.length ? (
          <div className="border border-dashed border-accent/25 bg-accent/5 px-5 py-12 text-center text-sm text-muted">
            {!loaded
              ? '点击刷新载入片单。'
              : movies.length
                ? '没有匹配的电影，试着清空筛选。'
                : '还没有电影，添加一部想看的电影吧。'}
          </div>
        ) : null}
        {visibleMovies.length > 0 && viewMode === 'cards' ? (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                editing={editingId === movie.id}
                disabled={saving || loading}
                onEdit={() => void openEditor(movie)}
                onDetails={() => void openDetails(movie)}
                onToggle={() => void toggleWatched(movie)}
                onObserve={() => void observeSql(movie)}
                onDelete={() => void deleteRecord(movie)}
              />
            ))}
          </div>
        ) : null}
        {visibleMovies.length > 0 && viewMode === 'list' ? (
          <MovieListView
            movies={visibleMovies}
            disabled={saving || loading}
            onEdit={(movie) => void openEditor(movie)}
            onDetails={(movie) => void openDetails(movie)}
            onToggle={(movie) => void toggleWatched(movie)}
            onObserve={(movie) => void observeSql(movie)}
            onDelete={(movie) => void deleteRecord(movie)}
          />
        ) : null}
      </section>

      <Drawer.Backdrop
        isOpen={formOpen}
        isDismissable={false}
        isKeyboardDismissDisabled={saving}
        onOpenChange={(open) => {
          if (!open) void closeEditor()
        }}
      >
        <Drawer.Content placement="right">
          <Drawer.Dialog className="border-l border-accent/20 p-0 data-[placement=right]:w-full data-[placement=right]:max-w-full sm:data-[placement=right]:w-[440px]">
            <Drawer.CloseTrigger aria-label="关闭观影表单" isDisabled={saving} />
            <Drawer.Header className="gap-1.5 border-b border-accent/15 bg-linear-to-br from-accent/12 to-surface px-5 py-5 pr-14">
              <p className="flex items-center gap-2 text-xs font-semibold text-accent">
                <Clapperboard size={16} aria-hidden="true" />
                观影记录
              </p>
              <Drawer.Heading className="text-xl font-semibold">
                {editingId ? '编辑电影' : '添加电影'}
              </Drawer.Heading>
              <p className="text-sm text-muted">编辑电影资料，不会覆盖已有观影记录。</p>
              {dirty ? (
                <p role="status" className="text-xs text-warning-soft-foreground">
                  有未保存的内容
                </p>
              ) : null}
            </Drawer.Header>
            <Drawer.Body className="m-0 px-5 py-4 text-foreground">
              <MovieForm
                form={form}
                disabled={saving || loading}
                onChange={setForm}
                onSubmit={(event) => void submit(event)}
              />
            </Drawer.Body>
            <Drawer.Footer className="border-t border-border bg-surface px-5 py-4">
              <Button variant="secondary" isDisabled={saving} onPress={() => void closeEditor()}>
                取消
              </Button>
              <Button
                form="movie-record-form"
                type="submit"
                isPending={saving}
                isDisabled={saving || loading || (editingId != null && !dirty)}
              >
                {editingId ? '保存修改' : '加入片单'}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
      {detailMovie ? (
        <MovieDetailDrawer
          movie={detailMovie}
          disabled={saving || loading}
          onClose={() => setDetailId(null)}
          onEdit={() => void openEditor(detailMovie)}
          onWatch={() => void toggleWatched(detailMovie)}
        />
      ) : null}
      {watchingMovie ? (
        <WatchRecordDrawer
          key={watchingMovie.id}
          movie={watchingMovie}
          saving={saving}
          onClose={() => setWatchingId(null)}
          onMutate={mutateWatch}
        />
      ) : null}
    </div>
  )
}
