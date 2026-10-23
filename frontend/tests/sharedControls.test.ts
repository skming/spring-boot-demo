import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

test('shared copy controls, editor tooltips and custom account trigger render accessibly', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    resolve: { alias: { '@monaco-editor/react': 'test-monaco-editor' } },
    // Monaco is browser-only; this SSR check covers the surrounding controls, not editor mounting.
    plugins: [
      {
        name: 'monaco-controls-test',
        enforce: 'pre',
        resolveId(source) {
          if (source === 'test-monaco-editor') return '\0test-monaco-editor'
        },
        load(id) {
          if (id === '\0test-monaco-editor')
            return 'export const renderedEditors = []; export default function Editor(props) { renderedEditors.push(props); return props.loading ?? null }'
        },
      },
    ],
  })
  try {
    const { CopyButton } = await server.ssrLoadModule('/src/shared/components/CopyButton.tsx')
    const copy = renderToStaticMarkup(
      createElement(CopyButton, { value: 'record-id', label: '复制记录 ID' }),
    )
    assert.match(copy, /aria-label="复制记录 ID"/)
    assert.match(copy, /role="status"/)
    assert.doesNotMatch(copy, /已复制到剪贴板/)
    const empty = renderToStaticMarkup(createElement(CopyButton, { value: '', label: '复制' }))
    assert.match(empty, /disabled/)

    const { SqlEditor } = await server.ssrLoadModule('/src/features/lab/components/SqlEditor.tsx')
    let editor = ''
    assert.doesNotThrow(() => {
      editor = renderToStaticMarkup(
        createElement(SqlEditor, {
          value: 'SELECT 1',
          onChange: () => {},
          onRun: () => {},
          tables: [],
          table: null,
        }),
      )
    }, 'SQL editor controls must render')
    assert.match(editor, /aria-label="SQL 编辑操作"/)
    assert.match(editor, /aria-label="复制全部 SQL"/)
    assert.match(editor, /aria-label="撤销"/)
    assert.match(editor, /aria-label="开启自动换行"|aria-label="关闭自动换行"/)
    assert.match(editor, /执行全部/)
    const { ThemeSwitcher } = await server.ssrLoadModule('/src/shared/components/ThemeSwitcher.tsx')
    const themeControl = renderToStaticMarkup(createElement(ThemeSwitcher))
    assert.match(themeControl, /aria-label="切换主题，当前：跟随系统"/)
    assert.match(themeControl, /data-slot="dropdown-trigger"/)
    assert.match(themeControl, /aria-haspopup="true"|aria-haspopup="menu"/)
    assert.match(themeControl, /aria-expanded="false"/)
    const themeTrigger = themeControl.match(/<[^>]*aria-label="切换主题[^>]*>/)?.[0]
    assert.ok(themeTrigger)
    assert.match(themeTrigger, /border-0/)
    assert.doesNotMatch(themeTrigger, /border-border|hover:border-/)

    const { MovieCard } = await server.ssrLoadModule('/src/features/movie/components/MovieCard.tsx')
    const movie = {
      id: 'record-id',
      title: '电影',
      director: null,
      releaseYear: 2014,
      genres: ['剧情', '科幻'],
      watchStatus: 'WANT_TO_WATCH',
      watchStatusLabel: '接口待观影',
      rating: null,
      watchedOn: null,
      notes: null,
      createdAt: '',
      updatedAt: '',
      watchRecords: [],
    }
    const card = renderToStaticMarkup(
      createElement(MovieCard, {
        movie,
        editing: false,
        disabled: false,
        onEdit: () => {},
        onToggle: () => {},
        onObserve: () => {},
        onDelete: () => {},
      }),
    )
    assert.match(card, /aria-label="复制记录 ID"/)
    const { MovieListView } = await server.ssrLoadModule(
      '/src/features/movie/components/MovieListView.tsx',
    )
    const actions = {
      disabled: false,
      onEdit: () => {},
      onDetails: () => {},
      onToggle: () => {},
      onObserve: () => {},
      onDelete: () => {},
    }
    for (const watchRecords of [
      [],
      [
        {
          id: 'watch-1',
          watchedOn: '2026-10-21',
          rating: 5,
          notes: '观影笔记\n'.repeat(100),
          createdAt: '',
          updatedAt: '',
        },
      ],
    ]) {
      const notes = '电影备注\n'.repeat(100) + '备注结尾'
      const withNotes = {
        ...movie,
        notes,
        watchRecords,
        watchStatus: watchRecords.length ? 'WATCHED' : 'WANT_TO_WATCH',
        watchedOn: watchRecords.length ? '2026-10-21' : null,
        rating: watchRecords.length ? 5 : null,
      }
      for (const [index, component] of [
        createElement(MovieCard, { ...actions, editing: false, movie: withNotes }),
        createElement(MovieListView, { ...actions, movies: [withNotes] }),
      ].entries()) {
        const markup = renderToStaticMarkup(component)
        assert.ok(markup.includes(notes), 'Movie notes must remain complete, including line breaks')
        assert.doesNotMatch(markup, /<details|历次观影记录|观影笔记/)
        if (index === 0) {
          assert.match(markup, /line-clamp-3/)
          assert.match(markup, /whitespace-pre-wrap break-words/)
          assert.doesNotMatch(markup, /truncate/)
        } else {
          assert.doesNotMatch(markup, /line-clamp/)
          assert.match(markup, /w-64 truncate/)
        }
        if (index === 1) {
          const body = markup.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1]
          assert.ok(body)
          const cells = Array.from(
            body.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g),
            (match) => match[1],
          )
          assert.equal(cells.length, 7)
          assert.ok(cells[0].includes(movie.title))
          assert.ok(!cells[0].includes(notes))
          assert.ok(cells[1].includes(notes))
          assert.match(cells[1], /w-64 truncate/)
          assert.doesNotMatch(cells[1], /whitespace-pre-wrap|break-words/)
        }
        assert.match(markup, /aria-label="查看详情"/)
        assert.match(markup, new RegExp(`${watchRecords.length} 次观看`))
        if (watchRecords.length) {
          assert.match(markup, /fill-warning text-warning/)
          assert.doesNotMatch(markup, /fill-rating|text-rating/)
          assert.match(markup, /再看一次/)
          assert.match(markup, /2026-10-21/)
        } else assert.match(markup, /记录观影/)
      }
    }
    const historyOnly = renderToStaticMarkup(
      createElement(MovieCard, {
        ...actions,
        editing: false,
        movie: {
          ...movie,
          watchStatus: 'WATCHED',
          watchRecords: [
            { id: 'recent', watchedOn: '2026-10-21', rating: null, notes: '重看感想' },
            { id: 'first', watchedOn: '2026-01-01', rating: 4, notes: null },
          ],
        },
      }),
    )
    assert.match(historyOnly, /暂无电影备注/)
    assert.doesNotMatch(historyOnly, /重看感想|未填写观影笔记|4 \/ 5|<details/)
    assert.match(historyOnly, /2 次观看/)
    assert.match(historyOnly, /aria-label="查看详情"/)
    const { MovieRecordActions } = await server.ssrLoadModule(
      '/src/features/movie/components/MovieRecordActions.tsx',
    )
    let detailOpenCount = 0
    let sqlOpenCount = 0
    let deleteCount = 0
    const iconTypes: unknown[][] = []
    for (const watchStatus of ['WATCHED', 'WANT_TO_WATCH']) {
      const controls = MovieRecordActions({
        ...actions,
        movie: { ...movie, watchStatus },
        onDetails: () => detailOpenCount++,
        onObserve: () => sqlOpenCount++,
        onDelete: () => deleteCount++,
      })
      const buttons = controls.props.children[0].map(
        (tooltip: {
          props: { children: { props: { children: { props: Record<string, unknown> } } }[] }
        }) => tooltip.props.children[0].props.children,
      )
      iconTypes.push(
        buttons.map(
          (button: { props: { children: { type: unknown } } }) => button.props.children.type,
        ),
      )
      assert.deepEqual(
        buttons.map((button: { props: Record<string, unknown> }) => button.props['aria-label']),
        ['查看详情', '编辑电影', watchStatus === 'WATCHED' ? '再看一次' : '记录观影'],
      )
      assert.ok(
        buttons.every(
          (button: { props: { isIconOnly: boolean; isDisabled: boolean } }) =>
            button.props.isIconOnly && !button.props.isDisabled,
        ),
      )
      buttons[0].props.onPress()
      const dropdown = controls.props.children[2]
      const menu = dropdown.props.children[1].props.children
      assert.deepEqual(menu.props.disabledKeys, [])
      assert.deepEqual(
        menu.props.children.map((item: { props: { textValue: string } }) => item.props.textValue),
        ['查看 SQL', '删除电影'],
      )
      assert.equal(sqlOpenCount, deleteCount)
      menu.props.onAction('sql')
      menu.props.onAction('delete')
    }
    assert.equal(detailOpenCount, 2)
    assert.deepEqual(iconTypes[0], iconTypes[1])
    assert.equal(sqlOpenCount, 2)
    assert.equal(deleteCount, 2)
    const disabledActions = MovieRecordActions({ ...actions, disabled: true, movie })
    assert.ok(
      disabledActions.props.children[0].every(
        (tooltip: {
          props: { children: { props: { children: { props: { isDisabled: boolean } } } }[] }
        }) => tooltip.props.children[0].props.children.props.isDisabled,
      ),
    )
    assert.deepEqual(
      disabledActions.props.children[2].props.children[1].props.children.props.disabledKeys,
      ['sql', 'delete'],
    )
    assert.match(card, /line-clamp-2 h-12/)
    assert.match(card, /line-clamp-1 h-5/)
    const list = renderToStaticMarkup(createElement(MovieListView, { ...actions, movies: [movie] }))
    assert.match(card, /mt-auto justify-end/)
    for (const markup of [card, list])
      assert.match(markup, /flex shrink-0 flex-nowrap items-center justify-end gap-1/)
    const actionIcons = (markup: string) => {
      const toolbar = markup.match(
        /<div role="group" aria-label="电影操作"[^>]*>([\s\S]*?)<\/div>/,
      )?.[1]
      assert.ok(toolbar)
      return toolbar.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)
    }
    assert.deepEqual(actionIcons(card), actionIcons(list))
    for (const markup of [card, list]) {
      assert.match(markup, /aria-label="发行年份">2014/)
      assert.match(markup, /接口待观影/)
      assert.match(markup, /aria-label="电影类型"/)
      for (const genre of movie.genres) {
        assert.match(markup, new RegExp(`data-slot="chip-label">${genre}</span>`))
      }
      assert.doesNotMatch(markup, /剧情 \/ 科幻/)
    }
    const { MovieForm } = await server.ssrLoadModule('/src/features/movie/components/MovieForm.tsx')
    const { movieToInput } = await server.ssrLoadModule('/src/features/movie/movieView.ts')
    let changed = movieToInput(movie)
    const yearForm = MovieForm({
      form: changed,
      disabled: false,
      onChange: (value: typeof changed) => {
        changed = value
      },
      onSubmit: () => {},
    })
    const yearField = yearForm.props.children.find(
      (child: { props?: { name?: string } }) => child?.props?.name === 'releaseYear',
    )
    assert.equal(yearField.props.value, 2014)
    assert.equal(yearField.props.isRequired, true)
    const directorField = yearForm.props.children.find(
      (child: { props?: { name?: string } }) => child?.props?.name === 'director',
    )
    assert.equal(directorField.props.isRequired, true)
    assert.equal(yearField.props.minValue, 1888)
    assert.equal(yearField.props.maxValue, 2100)
    yearField.props.onChange(1994)
    assert.equal(changed.releaseYear, 1994)
    for (const empty of [NaN, undefined]) {
      yearField.props.onChange(empty)
      assert.equal(changed.releaseYear, null)
      assert.match(JSON.stringify(changed), /"releaseYear":null/)
    }
    const formMarkup = renderToStaticMarkup(yearForm)
    assert.match(formMarkup, /发行年份/)
    assert.doesNotMatch(formMarkup, /发行年份（选填）|导演（选填）/)
    assert.match(formMarkup, /value="2014"/)
    for (const component of [
      createElement(MovieCard, {
        ...actions,
        editing: false,
        movie: { ...movie, releaseYear: null },
      }),
      createElement(MovieListView, { ...actions, movies: [{ ...movie, releaseYear: null }] }),
    ])
      assert.doesNotMatch(renderToStaticMarkup(component), /aria-label="发行年份"/)
    for (const markup of [
      renderToStaticMarkup(
        createElement(MovieCard, { ...actions, editing: false, movie: { ...movie, genres: [] } }),
      ),
      renderToStaticMarkup(
        createElement(MovieListView, { ...actions, movies: [{ ...movie, genres: [] }] }),
      ),
    ])
      assert.match(markup, /未分类/)

    const { EMPTY_MOVIE } = await server.ssrLoadModule('/src/features/movie/movieView.ts')
    const { ConfirmContext } = await server.ssrLoadModule('/src/app/providers/confirm-context.ts')
    const form = renderToStaticMarkup(
      createElement(
        ConfirmContext.Provider,
        { value: async () => false },
        createElement(MovieForm, {
          form: EMPTY_MOVIE,
          disabled: false,
          watchStatuses: [
            { value: 'WANT_TO_WATCH', label: '接口表单待观影' },
            { value: 'WATCHED', label: '接口表单已观影' },
          ],
          onChange: () => {},
          onSubmit: () => {},
        }),
      ),
    )
    assert.match(form, /电影备注 \/ 想看理由/)
    assert.doesNotMatch(form, /观影状态/)

    const { AppLayout } = await server.ssrLoadModule('/src/app/layouts/AppLayout.tsx')
    const { AuthContext } = await server.ssrLoadModule('/src/app/providers/auth-context.ts')
    const layout = renderToStaticMarkup(
      createElement(
        AuthContext.Provider,
        {
          value: {
            user: { email: 'learner@example.com', userId: 'user-id' },
            isAuthenticated: true,
            applyAuth: () => {},
            logout: () => {},
          },
        },
        createElement(MemoryRouter, {}, createElement(AppLayout)),
      ),
    )
    assert.match(layout, /aria-label="打开账户菜单"/)
    assert.match(layout, /aria-label="切换主题，当前：跟随系统"/)
    assert.match(layout, /aria-label="主导航"/)
    assert.doesNotMatch(layout, />learner</)
    assert.match(layout, /aria-haspopup="true"|aria-haspopup="menu"/)
    assert.match(layout, /data-slot="dropdown-trigger"/)
    assert.match(layout, /aria-expanded="false"/)
    assert.match(layout, /href="\/learn"/)
    assert.match(layout, /aria-label="DB Lab 首页"/)
    assert.doesNotMatch(layout, /观影记录 · SQL 工作台 · 操作日志/)
    for (const [path, expected] of [
      ['/movies', '/movies'],
      ['/lab', '/lab'],
      ['/logs', '/logs'],
      ['/learn', '/learn'],
      ['/learn/transaction-commit', '/learn'],
      ['/learn/sql-join/sql', '/learn'],
    ]) {
      const routedLayout = renderToStaticMarkup(
        createElement(
          AuthContext.Provider,
          {
            value: {
              user: { email: 'learner@example.com', userId: 'user-id' },
              isAuthenticated: true,
              applyAuth: () => {},
              logout: () => {},
            },
          },
          createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppLayout)),
        ),
      )
      const navigation = routedLayout.match(/<nav aria-label="主导航"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
      assert.ok(navigation)
      assert.equal((navigation.match(/<a\b/g) ?? []).length, 4)
      const activeLinks = navigation.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? []
      assert.equal(activeLinks.length, 1, `Expected one active link at ${path}`)
      assert.ok(activeLinks[0].includes(`href="${expected}"`))
      assert.match(activeLinks[0], /border-accent/)
    }

    const { CourseIndex, LessonView } = await server.ssrLoadModule(
      '/src/features/learn/pages/LearnPage.tsx',
    )
    const { LESSONS, COURSE_UNITS } = await server.ssrLoadModule(
      '/src/features/learn/curriculum.ts',
    )
    const index = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CourseIndex)))
    for (const item of LESSONS) assert.match(index, new RegExp(`href="/learn/${item.id}"`))
    const transactionLesson = LESSONS.find(
      (item: { id: string }) => item.id === 'transaction-commit',
    )
    const lesson = renderToStaticMarkup(
      createElement(MemoryRouter, {}, createElement(LessonView, { lesson: transactionLesson })),
    )
    const { renderedEditors } = await server.ssrLoadModule('test-monaco-editor')
    const javaEditors = renderedEditors.filter(
      (editor: { language: string }) => editor.language === 'java',
    )
    assert.equal(javaEditors.length, 1)
    for (const editor of javaEditors) {
      assert.equal(editor.theme, 'vs')
      assert.equal(editor.options.readOnly, true)
      assert.equal(editor.options.domReadOnly, true)
      assert.equal(editor.options.wordWrap, 'on')
      assert.equal(editor.options.automaticLayout, true)
      assert.ok(editor.height >= 80 && editor.height <= 420)
      assert.equal(editor.options.fontSize, 14)
      assert.equal(editor.options.lineHeight, 24)
      assert.equal(editor.options.wrappingIndent, 'indent')
      assert.match(editor.options.ariaLabel, /只读代码/)
    }
    assert.match(lesson, /flush、commit 与回滚/)
    assert.match(lesson, /aria-label="课程目录"/)
    assert.equal((lesson.match(/role="radiogroup"/g) ?? []).length, 1)
    assert.equal((lesson.match(/<input[^>]*type="radio"/g) ?? []).length, 2)
    assert.match(lesson, /aria-live="polite"/)
    assert.match(lesson, /复制 flush、commit 与回滚/)
    assert.match(lesson, /Java · 只读/)
    assert.match(lesson, /entityManager.flush/)
    assert.doesNotMatch(lesson, /判断正确。|再想一步。/)
    assert.equal((lesson.match(/aria-current="location"/g) ?? []).length, 1)
    assert.match(lesson, /href="#learn-entry" aria-current="location"/)
    for (const id of [
      'learn-entry',
      'learn-boundary',
      'learn-practice',
      'learn-verify',
      'learn-reference',
    ]) {
      assert.match(lesson, new RegExp(`href="#${id}"`))
      assert.match(lesson, new RegExp(`id="${id}"`))
    }
    const sqlLesson = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {},
        createElement(LessonView, {
          lesson: LESSONS.find((item: { id: string }) => item.id === 'sql-join'),
        }),
      ),
    )
    assert.match(sqlLesson, /href="\/learn\/sql-join\/sql"/)
    assert.match(lesson, /aria-label="本课前置课程"/)
    assert.match(lesson, /href="\/learn\/watch-crud"/)
    assert.match(lesson, /href="\/learn\/transaction-proxy"/)
    assert.match(lesson, /动手操作/)
    assert.match(lesson, /核对结果/)
    assert.match(index, /9 个阶段、32 节主线、10 节专题/)
    assert.match(index, /id="main-route"/)
    assert.match(index, /id="topic-route"/)
    const mainDirectory = index.slice(
      index.indexOf('id="main-route"'),
      index.indexOf('id="topic-route"'),
    )
    assert.match(mainDirectory, /href="\/learn\/first-change"/)
    assert.doesNotMatch(
      mainDirectory,
      /href="\/learn\/(transaction-checked|genres-converter|requires-new)"/,
    )
    assert.match(mainDirectory, /aria-label="主线阶段跳转"/)
    assert.match(mainDirectory, /第 17–21 课/)
    for (const unit of COURSE_UNITS) {
      assert.match(mainDirectory, new RegExp(`href="#main-${unit.id}"`))
      assert.match(mainDirectory, new RegExp(`id="main-${unit.id}"`))
      assert.match(mainDirectory, new RegExp(`aria-labelledby="main-${unit.id}-title"`))
      assert.match(mainDirectory, new RegExp(`aria-label="${unit.title}课程"`))
    }
    const required = LESSONS.filter((item: { optional: boolean }) => !item.optional)
    const positions = required.map((item: { id: string }) =>
      mainDirectory.indexOf(`href="/learn/${item.id}"`),
    )
    assert.ok(
      positions.every(
        (position: number, i: number) => position >= 0 && (i === 0 || position > positions[i - 1]),
      ),
      'Responsive layout must preserve curriculum reading and keyboard order',
    )
    const topics = index.slice(index.indexOf('id="topic-route"'))
    assert.match(topics, /id="topic-transactions"/)
    assert.doesNotMatch(topics, /id="topic-http"/)
    const sqliteTopic = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {},
        createElement(LessonView, {
          lesson: LESSONS.find((item: { id: string }) => item.id === 'transaction-catch'),
        }),
      ),
    )
    assert.match(sqliteTopic, /默认 SQLite 环境/)
    assert.doesNotMatch(sqliteTopic, /本课需要 Docker/)
    const topicFooter = sqliteTopic.slice(sqliteTopic.indexOf('aria-label="相邻课程"'))
    assert.match(topicFooter, /上一专题/)
    assert.match(topicFooter, /下一专题/)
    assert.match(topicFooter, /href="\/learn\/transaction-proxy"/)
    assert.match(topicFooter, /href="\/learn\/transaction-checked"/)
    assert.match(topicFooter, /返回主线：审计快照与写入结果/)
    assert.match(topicFooter, /href="\/learn\/operation-audit"/)
    const elective = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {},
        createElement(LessonView, {
          lesson: LESSONS.find((item: { id: string }) => item.id === 'requires-new'),
        }),
      ),
    )
    assert.match(elective, /深入专题/)
    assert.match(elective, /不依赖本实验/)
    const finalTopicFooter = elective.slice(elective.indexOf('aria-label="相邻课程"'))
    assert.match(finalTopicFooter, /已到专题目录末尾/)
    assert.match(finalTopicFooter, /href="\/learn#topic-route"/)
    assert.match(finalTopicFooter, /返回主线：审计快照与写入结果/)
    assert.doesNotMatch(finalTopicFooter, /下一专题/)
    const firstTopic = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        {},
        createElement(LessonView, {
          lesson: LESSONS.find((item: { id: string }) => item.id === 'java-collections'),
        }),
      ),
    )
    const firstTopicFooter = firstTopic.slice(firstTopic.indexOf('aria-label="相邻课程"'))
    assert.match(firstTopicFooter, /查看全部专题/)
    assert.match(firstTopicFooter, /下一专题/)
    assert.doesNotMatch(firstTopicFooter, /上一专题/)
    const { LessonQuiz } = await server.ssrLoadModule(
      '/src/features/learn/components/LessonQuiz.tsx',
    )
    const question = LESSONS.find((item: { id: string }) => item.id === 'data-model').quiz
    const key = LessonQuiz({ question, index: 0 }).key
    assert.equal(LessonQuiz({ question: structuredClone(question), index: 0 }).key, key)
    for (const revised of [
      { ...question, options: [...question.options].reverse() },
      {
        ...question,
        answer: question.options.find(
          (option: { value: string }) => option.value !== question.answer,
        ).value,
      },
      { ...question, explanation: '更新后的讲解' },
    ])
      assert.notEqual(
        LessonQuiz({ question: revised, index: 0 }).key,
        key,
        'Question revision must reset the form subtree',
      )
    assert.ok(renderedEditors.some((editor: { language: string }) => editor.language === 'sql'))
  } finally {
    await server.close()
  }
})
