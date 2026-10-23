import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('auth forms validate before requests and submit normalized schema data', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    plugins: [
      {
        name: 'auth-form-submit-fixture',
        enforce: 'pre',
        transform(source, id) {
          if (!id.split('?')[0].endsWith('/features/auth/pages/AuthPage.tsx')) return
          return (
            source
              .replace('  toast,', '')
              .replace("from '../api/authApi'", "from 'auth-form-test-api'")
              .replace("useState<Mode>('login')", 'useState<Mode>(fixture.mode)')
              .replace("useState('')", 'useState(fixture.email)')
              .replace("useState('')", 'useState(fixture.password)')
              .replace('useState(false)', 'useState(fixture.pending)')
              .replace('<form className=', '<CapturedForm className=')
              .replace('</form>', '</CapturedForm>') +
            "\nimport { fixture, CapturedForm, toast } from 'auth-form-test-api'"
          )
        },
        resolveId(id) {
          if (id === 'auth-form-test-api') return '\0auth-form-test-api'
        },
        load(id) {
          if (id !== '\0auth-form-test-api') return
          return `import { createElement } from 'react';
          export const forms = [], requests = [], messages = [];
          export const fixture = { mode: 'login', email: '', password: '', pending: false, error: null };
          export function CapturedForm(props) { forms.push(props); return createElement('form', props); }
          async function send(mode, input) {
            requests.push({ mode, input });
            if (fixture.error) throw fixture.error;
            return { userId: 'test-user', email: input.email, accessToken: 'test-only-response' };
          }
          export const login = input => send('login', input), register = input => send('register', input);
          export const toast = { success: message => messages.push(message), danger: message => messages.push(message) };`
        },
      },
    ],
  })
  try {
    const { AuthPage } = await server.ssrLoadModule('/src/features/auth/pages/AuthPage.tsx')
    const { AuthContext } = await server.ssrLoadModule('/src/app/providers/auth-context.ts')
    const { ApiError } = await server.ssrLoadModule('/src/shared/api/http.ts')
    const { forms, requests, fixture, messages } = await server.ssrLoadModule('auth-form-test-api')
    let applied = 0
    const render = () => {
      renderToStaticMarkup(
        createElement(
          AuthContext.Provider,
          {
            value: {
              user: null,
              isAuthenticated: false,
              applyAuth: () => applied++,
              logout: () => {},
            },
          },
          createElement(AuthPage),
        ),
      )
      return forms.at(-1)
    }
    for (const invalid of [
      { mode: 'login', email: '', password: '' },
      { mode: 'login', email: 'not-email', password: 'password' },
      { mode: 'register', email: 'viewer@example.com', password: 'short' },
      { mode: 'register', email: 'viewer@example.com', password: 'x'.repeat(73) },
    ]) {
      Object.assign(fixture, invalid)
      await render().onSubmit({ preventDefault() {} })
      assert.equal(requests.length, 0)
      assert.equal(applied, 0)
      assert.equal(messages.at(-1), '请先修正表单错误')
    }
    for (const mode of ['login', 'register']) {
      Object.assign(fixture, {
        mode,
        email: ' viewer@example.com ',
        password: mode === 'login' ? 'x' : ' password ',
      })
      await render().onSubmit({ preventDefault() {} })
      assert.deepEqual(requests.at(-1), {
        mode,
        input: { email: 'viewer@example.com', password: fixture.password },
      })
    }
    assert.equal(applied, 2)
    for (const error of [
      new ApiError('邮箱或密码错误', 401),
      new ApiError('邮箱已注册', 409),
      new ApiError('字段不合法', 400, { email: '邮箱无效' }),
    ]) {
      fixture.error = error
      await render().onSubmit({ preventDefault() {} })
      assert.equal(applied, 2)
      assert.equal(messages.at(-1), error.message)
    }
    fixture.error = null
    fixture.pending = true
    const count = requests.length
    await render().onSubmit({ preventDefault() {} })
    assert.equal(requests.length, count)
  } finally {
    await server.close()
  }
})
