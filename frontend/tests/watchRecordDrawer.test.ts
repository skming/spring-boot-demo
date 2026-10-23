import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createElement, isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('watch drawer only closes after a successful save, and stays open on failure or while saving', async () => {
  // SSR 不渲染 Portal；仅替换抽屉外壳，捕获组件真正的表单提交回调。
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    plugins: [
      {
        name: 'watch-drawer-submit-test',
        enforce: 'pre',
        transform(source, id) {
          if (id.split('?')[0].endsWith('/features/movie/components/WatchRecordDrawer.tsx')) {
            return (
              source
                .replace("from '@heroui/react'", "from 'watch-drawer-test-ui'")
                .replace('useState(blank)', 'useState(() => fixture.input ?? blank())')
                .replace(
                  'useState<string | null>(null)',
                  'useState<string | null>(fixture.recordId)',
                ) + "\nimport { fixture } from 'watch-drawer-test-ui'"
            )
          }
        },
        resolveId(id) {
          if (id === 'watch-drawer-test-ui') return '\0watch-drawer-test-ui'
        },
        load(id) {
          if (id !== '\0watch-drawer-test-ui') return
          return `
          export const forms = [];
          export const messages = [];
          export const warnings = [];
          export const fixture = { input: null, recordId: null };
          const pass = ({children}) => children ?? null;
          const hidden = () => null;
          export const Drawer = { Backdrop: pass, Content: pass, Dialog: pass,
            Header: hidden, Heading: hidden, CloseTrigger: hidden, Footer: hidden,
            Body: ({children}) => { forms.push(children.find(child => child?.type === 'form')); return null; } };
          export const Button = hidden, Label = hidden, TextArea = hidden, TextField = hidden;
          export const Select = Object.assign(hidden, {Trigger:hidden, Value:hidden, Indicator:hidden, Popover:hidden});
          export const ListBox = Object.assign(hidden, {Item:Object.assign(hidden, {Indicator:hidden}), ItemIndicator:hidden});
          export const toast = { success: (message) => messages.push(message), warning: (message) => warnings.push(message) };
        `
        },
      },
    ],
  })
  try {
    const { WatchRecordDrawer } = await server.ssrLoadModule(
      '/src/features/movie/components/WatchRecordDrawer.tsx',
    )
    const { ConfirmContext } = await server.ssrLoadModule('/src/app/providers/confirm-context.ts')
    const { forms, messages, warnings, fixture } =
      await server.ssrLoadModule('watch-drawer-test-ui')
    const movie = { id: 'movie-id', title: '电影', watchRecords: [] }
    let closeCount = 0
    let confirmCount = 0
    let requestCount = 0
    const render = (onMutate: (...args: unknown[]) => Promise<unknown>, saving = false) => {
      renderToStaticMarkup(
        createElement(
          ConfirmContext.Provider,
          {
            value: async () => {
              confirmCount++
              return false
            },
          },
          createElement(WatchRecordDrawer, {
            movie,
            saving,
            onClose: () => closeCount++,
            onMutate,
          }),
        ),
      )
      return forms.at(-1)
    }
    const pending = Promise.withResolvers<unknown>()
    const form = render(() => {
      requestCount++
      return pending.promise
    })
    const ratingOptions = new Map<string, string | undefined>()
    function collectRatingOptions(node: ReactNode): void {
      if (Array.isArray(node)) {
        node.forEach(collectRatingOptions)
      } else if (isValidElement<{ id?: string; textValue?: string; children?: ReactNode }>(node)) {
        if (node.props.id) ratingOptions.set(node.props.id, node.props.textValue)
        collectRatingOptions(node.props.children)
      }
    }
    collectRatingOptions(form)
    assert.equal(ratingOptions.get('unrated'), '尚未评分')
    for (const rating of [1, 2, 3, 4, 5]) {
      assert.equal(ratingOptions.get(String(rating)), `${rating} 星`)
    }
    form.props.onSubmit({ preventDefault() {} })
    assert.equal(requestCount, 1)
    assert.equal(closeCount, 0)
    pending.resolve(movie)
    await setImmediate()
    assert.equal(closeCount, 1)
    assert.equal(confirmCount, 0)
    assert.deepEqual(messages, ['已记录本次观影'])

    const failed = render(async () => {
      throw new Error('save failed')
    })
    failed.props.onSubmit({ preventDefault() {} })
    await setImmediate()
    assert.equal(closeCount, 1)
    assert.equal(messages.length, 1)

    const busy = render(async () => {
      requestCount++
      return movie
    }, true)
    busy.props.onSubmit({ preventDefault() {} })
    await setImmediate()
    assert.equal(requestCount, 1)
    assert.equal(closeCount, 1)
    for (const invalid of [
      { watchedOn: '', rating: null, notes: '' },
      { watchedOn: '2025-02-29', rating: null, notes: '' },
      { watchedOn: '9999-12-31', rating: null, notes: '' },
      { watchedOn: '2024-02-29', rating: 0, notes: '' },
      { watchedOn: '2024-02-29', rating: 5, notes: 'x'.repeat(1001) },
    ]) {
      fixture.input = invalid
      const invalidForm = render(async () => {
        requestCount++
        return movie
      })
      assert.equal(invalidForm.props.noValidate, true)
      invalidForm.props.onSubmit({ preventDefault() {} })
      await setImmediate()
      assert.equal(requestCount, 1)
      assert.equal(closeCount, 1)
    }
    assert.equal(warnings.length, 5)
    fixture.recordId = 'watch-id'
    fixture.input = { watchedOn: '2024-02-29', rating: 5, notes: '  重看笔记  ' }
    let saved: unknown[] = []
    const editing = render(async (...args) => {
      saved = args
      return movie
    })
    editing.props.onSubmit({ preventDefault() {} })
    await setImmediate()
    assert.deepEqual(saved, ['movie-id', 'watch-id', { ...fixture.input, notes: '重看笔记' }])
    assert.equal(closeCount, 2)
    assert.equal(messages.at(-1), '观影记录已更新')
    const failedEdit = render(async () => {
      throw new Error('save failed')
    })
    failedEdit.props.onSubmit({ preventDefault() {} })
    await setImmediate()
    assert.equal(closeCount, 2)
  } finally {
    await server.close()
  }
})
