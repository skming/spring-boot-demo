import { Card, Chip } from '@heroui/react'
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import {
  COURSE_SECTIONS,
  COURSE_UNITS,
  LESSONS,
  REQUIRED_LESSONS,
  lessonNeighbors,
  topicMainContinuation,
  type Lesson,
} from '../curriculum'
import { LessonCode } from '../components/LessonCode'
import { LessonQuiz } from '../components/LessonQuiz'
import { useLessonNavigation } from '../hooks/useLessonNavigation'

const sectionClass = 'gap-0 overflow-hidden border border-border p-0 shadow-sm'
const headerClass = 'gap-1 border-b border-border bg-surface-secondary/70 px-5 py-4 sm:px-6'
const linkClass =
  'text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-focus'

export function LearnPage() {
  const { lessonId } = useParams()
  if (!lessonId) return <CourseIndex />
  const lesson = LESSONS.find((item) => item.id === lessonId)
  if (!lesson)
    return (
      <div className="space-y-3 py-10">
        <h1 className="text-2xl font-bold">课程不存在</h1>
        <Link to="/learn" className={linkClass}>
          返回课程目录
        </Link>
      </div>
    )
  // 切课时销毁题目与章节状态，避免上一课的答案、高亮或 Monaco 高度串入下一课。
  return <LessonView key={lesson.id} lesson={lesson} />
}

export function CourseIndex() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])
  return (
    <div className="space-y-8">
      <header className="relative space-y-4 overflow-hidden border border-accent/20 border-t-2 border-t-accent bg-linear-to-br from-accent/10 via-surface to-success/5 px-5 py-6 sm:px-7 sm:py-8">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-accent">
          <BookOpen size={16} aria-hidden="true" />
          DB LAB · 学习手册
        </p>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">从读懂接口到独立开发</h1>
            <p className="text-sm leading-7 text-muted">
              面向有 TypeScript 和接口联调经验的开发者。补齐 Java 与 Spring 基础，第 9
              课开始实际修改，逐步完成完整后端需求。
            </p>
            <p className="text-xs font-medium text-accent">
              {COURSE_UNITS.length} 个阶段、{REQUIRED_LESSONS.length} 节主线、
              {LESSONS.length - REQUIRED_LESSONS.length} 节专题
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              to={`/learn/${REQUIRED_LESSONS[0].id}`}
              className="button button--primary inline-flex items-center gap-2"
            >
              从第一课开始
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/learn/first-change" className="button button--secondary">
              第一次后端修改
            </Link>
          </div>
        </div>
        <nav
          aria-label="学习路线"
          className="flex flex-wrap gap-x-5 gap-y-2 border-t border-accent/15 pt-4 text-sm"
        >
          <a href="#main-route" className={linkClass}>
            快速开发主线
          </a>
          <a href="#topic-route" className={linkClass}>
            深入理解专题
          </a>
        </nav>
      </header>
      <section
        id="main-route"
        className="space-y-4 scroll-mt-24"
        aria-labelledby="main-route-title"
      >
        <div className="space-y-2 border-l-3 border-accent pl-4">
          <h2 id="main-route-title" className="text-xl font-semibold">
            快速开发主线
            <span className="ml-3 text-sm font-normal text-muted">
              {REQUIRED_LESSONS.length} 课
            </span>
          </h2>
          <p className="text-sm leading-7 text-muted">
            按阶段学习，也可直接进入熟悉的章节。授权和失败验证是主线必备内容。
          </p>
        </div>
        <nav aria-label="主线阶段跳转" className="flex flex-wrap gap-2">
          {COURSE_UNITS.map((unit, index) => (
            <a
              key={unit.id}
              href={`#main-${unit.id}`}
              className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-2 text-xs transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="font-mono text-accent">{String(index + 1).padStart(2, '0')}</span>
              {unit.title}
            </a>
          ))}
        </nav>
        <CourseDirectory optional={false} />
      </section>
      <section
        id="topic-route"
        className="space-y-4 scroll-mt-24"
        aria-labelledby="topic-route-title"
      >
        <div className="space-y-2 border-l-3 border-warning pl-4">
          <h2 id="topic-route-title" className="text-xl font-semibold">
            深入理解专题
            <span className="ml-3 text-sm font-normal text-muted">
              {LESSONS.length - REQUIRED_LESSONS.length} 课 · 按需查阅
            </span>
          </h2>
          <p className="text-sm leading-7 text-muted">
            不阻塞主线。只有 REQUIRES_NEW 独立提交实验需要 Docker/MySQL，其他专题使用默认环境。
          </p>
        </div>
        <CourseDirectory optional />
      </section>
      <p className="border-t border-border pt-4 text-xs leading-6 text-muted">
        阅读和作答不会自动标记为已掌握，也不会上传答案。课程内的操作与测试用于核对学习结果。
      </p>
    </div>
  )
}

function CourseDirectory({ optional }: { optional: boolean }) {
  return (
    <div className="space-y-4">
      {COURSE_UNITS.map((unit, index) => {
        const lessons = LESSONS.filter(
          (lesson) => lesson.unit === unit.id && lesson.optional === optional,
        )
        if (!lessons.length) return null
        const stageId = `${optional ? 'topic' : 'main'}-${unit.id}`
        const tone = optional ? 'text-warning-soft-foreground' : 'text-accent'
        return (
          <Card
            key={unit.id}
            id={stageId}
            aria-labelledby={`${stageId}-title`}
            className={`${sectionClass} scroll-mt-24 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]`}
          >
            <Card.Header
              className={`gap-3 border-b border-border bg-linear-to-br ${optional ? 'from-warning/8' : 'from-accent/8'} to-surface px-5 py-5 sm:px-6 lg:border-r lg:border-b-0`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-semibold tracking-wide ${tone}`}>
                  {optional ? '深入专题' : `阶段 ${String(index + 1).padStart(2, '0')}`}
                </span>
                <span className="border border-border bg-surface px-2 py-0.5 text-xs text-muted">
                  {lessons.length} 课
                </span>
              </div>
              <h3 id={`${stageId}-title`} className="text-lg font-semibold leading-7">
                {unit.title}
              </h3>
              <Card.Description className="text-xs leading-6">
                {optional ? '建议先完成相关主线，再结合源码深入理解。' : unit.outcome}
              </Card.Description>
              {!optional ? (
                <p className="font-mono text-xs text-muted">
                  第 {String(lessons[0].number).padStart(2, '0')}–
                  {String(lessons.at(-1)!.number).padStart(2, '0')} 课
                </p>
              ) : null}
            </Card.Header>
            <Card.Content className="min-w-0 p-2 sm:p-3">
              <ol
                aria-label={`${unit.title}${optional ? '专题' : '课程'}`}
                className="grid gap-1 xl:grid-cols-2"
              >
                {lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.id} className="min-w-0">
                    <Link
                      to={`/learn/${lesson.id}`}
                      className="group flex h-full items-start gap-3 border border-transparent px-3 py-3 transition-colors hover:border-accent/15 hover:bg-accent/5 focus-visible:bg-accent-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center border font-mono text-xs ${optional ? 'border-warning/20 bg-warning/10 text-warning-soft-foreground' : 'border-accent/15 bg-accent-soft text-accent'}`}
                      >
                        {String(optional ? lessonIndex + 1 : lesson.number).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-6 group-hover:text-accent">
                          {lesson.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {lesson.id === 'requires-new'
                            ? '需要 Docker/MySQL，不阻塞主线。'
                            : lesson.question}
                        </span>
                      </span>
                      <ArrowRight
                        size={15}
                        className="mt-1 shrink-0 text-muted transition-colors group-hover:text-accent group-focus-visible:text-accent"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            </Card.Content>
          </Card>
        )
      })}
    </div>
  )
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [lesson.id])
  const { activeId, scrollOffset, activateSection } = useLessonNavigation(COURSE_SECTIONS)
  const style = { scrollMarginTop: scrollOffset }
  const { previous, next } = lessonNeighbors(lesson)
  const mainContinuation = lesson.optional ? topicMainContinuation(lesson) : undefined
  const unit = COURSE_UNITS.find((item) => item.id === lesson.unit)!
  const prerequisites = lesson.prerequisites.map((id) => LESSONS.find((item) => item.id === id)!)
  const optionalLessons = LESSONS.filter(
    (item) => item.optional && item.prerequisites.includes(lesson.id),
  )
  return (
    <div className="space-y-5">
      <header className="space-y-3 border border-accent/20 bg-linear-to-br from-accent/12 via-surface to-success/8 px-5 py-6 sm:px-7">
        <Link to="/learn" className={`inline-flex items-center gap-1.5 text-xs ${linkClass}`}>
          <ArrowLeft size={14} aria-hidden="true" />
          全部课程
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Chip size="sm" color={lesson.optional ? 'warning' : 'accent'} variant="soft">
            <Chip.Label>
              {lesson.optional ? '深入专题' : `第 ${String(lesson.number).padStart(2, '0')} 课`} ·{' '}
              {unit.title}
            </Chip.Label>
          </Chip>
          <span className="text-xs text-muted">按阅读、操作和验证安排时间</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
        {prerequisites.length ? (
          <nav
            aria-label="本课前置课程"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
          >
            <span className="text-muted">建议先读</span>
            {prerequisites.map((item) => (
              <Link key={item.id} to={`/learn/${item.id}`} className={linkClass}>
                {item.title}
              </Link>
            ))}
          </nav>
        ) : (
          <p className="text-xs text-muted">入门起点，无需先学习其他课程。</p>
        )}
        {lesson.optional ? (
          <p className="text-sm leading-7 text-warning-soft-foreground">
            {lesson.id === 'requires-new'
              ? '本课需要 Docker/MySQL。暂不具备环境时可跳过，默认 SQLite 主线不依赖本实验。'
              : '本课为按需深入专题，不阻塞快速开发主线。使用默认 SQLite 环境即可。'}
          </p>
        ) : null}
        <p className="text-sm leading-7 text-muted">{lesson.question}</p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky" style={{ top: scrollOffset }}>
          <Card className={sectionClass}>
            <Card.Header className={headerClass}>
              <Card.Title className="text-base">本节内容</Card.Title>
            </Card.Header>
            <Card.Content className="p-2">
              <nav aria-label="课程目录" className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {COURSE_SECTIONS.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    aria-current={activeId === section.id ? 'location' : undefined}
                    onClick={() => activateSection(section.id)}
                    className={`flex gap-3 border-l-2 px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-focus ${activeId === section.id ? 'border-accent bg-accent-soft text-accent' : 'border-transparent hover:bg-surface-secondary'}`}
                  >
                    <span className="font-mono text-xs text-accent">0{index + 1}</span>
                    <span>
                      <span className="block text-sm font-medium">{section.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {section.description}
                      </span>
                    </span>
                  </a>
                ))}
              </nav>
            </Card.Content>
          </Card>
          <p className="border-l-2 border-success/40 px-4 text-xs leading-6 text-muted">
            代码片段默认只读，不会执行。SQL 实验使用独立样本库，不修改自己的片单。
          </p>
        </aside>
        <div className="min-w-0 space-y-5">
          <Card id="learn-entry" className={sectionClass} style={style}>
            <Card.Header className={headerClass}>
              <h2 className="text-lg font-semibold">{lesson.question}</h2>
            </Card.Header>
            <Card.Content className="space-y-3 p-5 sm:p-6">
              {lesson.paragraphs.map((text) => (
                <p key={text} className="text-sm leading-7 text-muted">
                  {text}
                </p>
              ))}
            </Card.Content>
          </Card>
          <Card id="learn-boundary" className={sectionClass} style={style}>
            <Card.Header className={headerClass}>
              <h2 className="text-lg font-semibold">代码与边界</h2>
            </Card.Header>
            <Card.Content className="space-y-4 p-5 sm:p-6">
              <LessonCode
                filename={`${lesson.title} · ${lesson.source.exact ? '源码节选' : '教学示例'}`}
                code={lesson.code}
                language={lesson.language}
              />
              <p className="break-all text-xs leading-6 text-muted">
                源码入口：{lesson.source.path}
                <br />
                定位：<code>{lesson.source.symbol}</code>
                <br />
                片段用于说明本课问题，可能省略参数或上下文，不是独立程序。
              </p>
              <p className="border-l-2 border-warning/40 bg-warning/5 px-4 py-3 text-sm leading-7">
                {lesson.pitfall}
              </p>
            </Card.Content>
          </Card>
          <Card id="learn-practice" className={sectionClass} style={style}>
            <Card.Header className={headerClass}>
              <h2 className="text-lg font-semibold">检查理解</h2>
              <Card.Description>不计分，可以反复作答。离开本课后答案重置。</Card.Description>
            </Card.Header>
            <Card.Content className="p-5 sm:p-6">
              <LessonQuiz key={lesson.id} question={lesson.quiz} index={0} />
            </Card.Content>
          </Card>
          <Card id="learn-verify" className={sectionClass} style={style}>
            <Card.Header className={headerClass}>
              <h2 className="text-lg font-semibold">验证结果</h2>
            </Card.Header>
            <Card.Content className="space-y-4 p-5 sm:p-6">
              <div className="border-l-2 border-accent/30 pl-4">
                <h3 className="text-sm font-semibold">动手操作</h3>
                <p className="mt-1 text-sm leading-7 text-muted">{lesson.exercise}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">核对结果</h3>
                <p className="mt-1 text-sm leading-7 text-muted">{lesson.verification}</p>
              </div>
              {lesson.language === 'sql' ? (
                <Link to={`/learn/${lesson.id}/sql`} className={linkClass}>
                  打开本课 SQL 实验
                </Link>
              ) : null}
              <p className="text-xs leading-6 text-muted">
                先说明你预测的结果，再运行对应检查。下方官方资料用于核对规则；页面本身不会替你运行测试或证明已掌握。
              </p>
            </Card.Content>
          </Card>
          <Card id="learn-reference" className={sectionClass} style={style}>
            <Card.Header className={headerClass}>
              <h2 className="text-lg font-semibold">资料与后续</h2>
            </Card.Header>
            <Card.Content className="space-y-5 p-5 sm:p-6">
              <a
                href={lesson.reference.url}
                className={`inline-flex items-center gap-1 text-sm ${linkClass}`}
              >
                {lesson.reference.title}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              {optionalLessons.length ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">相关专题（不影响主线顺序）</p>
                  {optionalLessons.map((item) => (
                    <Link key={item.id} to={`/learn/${item.id}`} className={`block ${linkClass}`}>
                      {item.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              <nav aria-label="相邻课程" className="space-y-4 border-t border-border pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {previous ? (
                    <Link
                      to={`/learn/${previous.id}`}
                      className="space-y-1 border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <span className="block text-xs text-muted">
                        ← {lesson.optional ? '上一专题' : '上一课'}
                      </span>
                      <span className="block text-sm font-medium">{previous.title}</span>
                    </Link>
                  ) : (
                    <Link
                      to={lesson.optional ? '/learn#topic-route' : '/learn#main-route'}
                      className={`self-center text-sm ${linkClass}`}
                    >
                      {lesson.optional ? '查看全部专题' : '查看主线目录'}
                    </Link>
                  )}
                  {next ? (
                    <Link
                      to={`/learn/${next.id}`}
                      className="space-y-1 border border-accent/25 bg-accent-soft px-4 py-3 transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <span className="block text-xs text-accent">
                        {lesson.optional ? '下一专题' : '下一课'} →
                      </span>
                      <span className="block text-sm font-medium">{next.title}</span>
                      {next.id === 'requires-new' ? (
                        <span className="block text-xs text-muted">
                          需要 Docker/MySQL，可跳过。
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <div className="space-y-2 border border-border bg-surface-secondary/50 px-4 py-3">
                      <p className="text-sm font-medium">
                        {lesson.optional ? '已到专题目录末尾' : '已到主线目录末尾'}
                      </p>
                      <Link
                        to={lesson.optional ? '/learn#topic-route' : '/learn#main-route'}
                        className={`text-sm ${linkClass}`}
                      >
                        {lesson.optional ? '查看全部专题' : '返回主线目录'} →
                      </Link>
                    </div>
                  )}
                </div>
                {mainContinuation ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div>
                      <p className="text-sm font-medium">继续快速开发主线</p>
                      <p className="mt-1 text-xs leading-6 text-muted">
                        专题按需阅读，也可以回到相关主线继续。
                      </p>
                    </div>
                    <Link to={`/learn/${mainContinuation.id}`} className={`text-sm ${linkClass}`}>
                      返回主线：{mainContinuation.title} →
                    </Link>
                  </div>
                ) : null}
              </nav>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  )
}
