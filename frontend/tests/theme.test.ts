import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('the real next-themes provider owns initialization and restores the existing saved preference', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  try {
    const { AppThemeProvider } = await server.ssrLoadModule(
      '/src/app/providers/AppThemeProvider.tsx',
    )
    const element = AppThemeProvider({ children: createElement('span', {}, 'theme-content') })
    assert.deepEqual(element.props.attribute, ['class', 'data-theme'])
    assert.equal(element.props.storageKey, 'db-lab-theme')
    assert.equal(element.props.defaultTheme, 'system')
    assert.equal(element.props.enableSystem, true)
    assert.equal(element.props.enableColorScheme, true)
    assert.equal(element.props.disableTransitionOnChange, true)
    const markup = renderToStaticMarkup(element)
    const script = markup.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1]
    assert.ok(script, 'The library must render its own initialization script')
    assert.ok(markup.indexOf('</script>') < markup.indexOf('theme-content'))
    for (const preference of ['light', 'dark', 'system', null]) {
      for (const dark of [false, true]) {
        const classes = new Set(['light'])
        const attributes = new Map<string, string>()
        const root = {
          style: { colorScheme: '' },
          classList: {
            remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
            add: (name: string) => classes.add(name),
          },
          setAttribute: (key: string, value: string) => attributes.set(key, value),
        }
        runInNewContext(script, {
          document: { documentElement: root },
          window: { matchMedia: () => ({ matches: dark }) },
          localStorage: {
            getItem: (key: string) => {
              assert.equal(key, 'db-lab-theme')
              return preference
            },
          },
        })
        const expected =
          preference === 'light' || preference === 'dark' ? preference : dark ? 'dark' : 'light'
        assert.deepEqual([...classes], [expected])
        assert.equal(attributes.get('data-theme'), expected)
        assert.equal(root.style.colorScheme, expected)
      }
    }
    assert.doesNotThrow(() =>
      runInNewContext(script, {
        localStorage: {
          getItem: () => {
            throw new Error('storage blocked')
          },
        },
        document: { documentElement: {} },
      }),
    )
  } finally {
    await server.close()
  }
})

test('the theme menu and both Monaco consumers use next-themes state', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    resolve: {
      alias: { 'next-themes': 'test-next-themes', '@monaco-editor/react': 'test-theme-editor' },
    },
    plugins: [
      {
        name: 'theme-consumers-test',
        enforce: 'pre',
        resolveId(source) {
          if (source === 'test-next-themes') return '\0test-theme'
          if (source === 'test-theme-editor') return '\0test-editor'
        },
        load(id) {
          if (id === '\0test-theme')
            return `export const state = { theme: undefined, resolvedTheme: undefined, calls: [] };
          export const useTheme = () => ({ ...state, setTheme: value => state.calls.push(value) });`
          if (id === '\0test-editor')
            return 'export const editors = []; export default function Editor(props) { editors.push(props); return null }'
        },
      },
    ],
  })
  try {
    const { ThemeSwitcher } = await server.ssrLoadModule('/src/shared/components/ThemeSwitcher.tsx')
    const { LessonCode } = await server.ssrLoadModule(
      '/src/features/learn/components/LessonCode.tsx',
    )
    const { SqlEditor } = await server.ssrLoadModule('/src/features/lab/components/SqlEditor.tsx')
    const { state } = await server.ssrLoadModule('test-next-themes')
    const { editors } = await server.ssrLoadModule('test-theme-editor')
    for (const [theme, resolved, label] of [
      ['light', 'light', '浅色'],
      ['dark', 'dark', '深色'],
      ['system', 'dark', '跟随系统'],
      ['system', 'light', '跟随系统'],
      [undefined, undefined, '跟随系统'],
    ]) {
      state.theme = theme
      state.resolvedTheme = resolved
      const control = ThemeSwitcher()
      assert.match(
        renderToStaticMarkup(control),
        new RegExp(`aria-label="切换主题，当前：${label}"`),
      )
      // 检查菜单绑定，而非在 SSR 中模拟真实下拉弹层或鼠标操作。
      const menu = control.props.children[1].props.children
      assert.deepEqual([...menu.props.selectedKeys], [theme ?? 'system'])
      for (const choice of ['light', 'dark', 'system']) {
        menu.props.onAction(choice)
        assert.equal(state.calls.at(-1), choice)
      }
      const count = state.calls.length
      menu.props.onAction('invalid')
      assert.equal(state.calls.length, count)
      renderToStaticMarkup(
        createElement(LessonCode, { filename: 'Example', code: 'SELECT 1', language: 'sql' }),
      )
      renderToStaticMarkup(
        createElement(SqlEditor, {
          value: 'SELECT 1',
          tables: [],
          table: null,
          onChange: () => {},
          onRun: () => {},
        }),
      )
      for (const editor of editors.slice(-2))
        assert.equal(editor.theme, resolved === 'dark' ? 'vs-dark' : 'vs')
    }
  } finally {
    await server.close()
  }
})

test('custom theme infrastructure is removed and the existing straight-edge style is unchanged', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /theme-init\.js|<html[^>]*(?:class|data-theme)=/)
  for (const path of [
    '../public/theme-init.js',
    '../src/shared/theme/theme.ts',
    '../src/shared/theme/useTheme.ts',
  ]) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false)
  }
  const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8')
  assert.ok(app.indexOf('<AppThemeProvider>') < app.indexOf('<BrowserRouter>'))
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(css, /--radius:\s*0;/)
  assert.match(css, /--field-radius:\s*0;/)
  assert.match(css, /color-scheme:\s*light/)
  assert.match(css, /color-scheme:\s*dark/)
})

test('warning uses amber with dark foreground and rating has no separate palette', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /--(?:color-)?rating/)
  assert.match(css, /--warning:\s*oklch\(78% 0\.16 80\)/)
  assert.match(css, /--warning-foreground:\s*oklch\(23% 0\.035 75\)/)
})
