import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

test('HTTP 客户端解包统一响应并保留错误与认证语义', async (t) => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  const originalFetch = globalThis.fetch
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  })
  try {
    const { http, ApiError, setUnauthorizedHandler } =
      await server.ssrLoadModule('/src/shared/api/http.ts')
    const { setAccessToken, getAccessToken } = await server.ssrLoadModule(
      '/src/shared/api/session.ts',
    )
    const reply = (body: unknown, status = 200) => {
      globalThis.fetch = async () => new Response(JSON.stringify(body), { status })
    }
    await t.test('对象、数组、分页和空结果均从 data 返回', async () => {
      for (const data of [{ id: 'movie' }, [], { content: [], totalElements: 0 }, null]) {
        reply({ code: 0, message: '操作成功', data })
        assert.deepEqual(await http('/api/test'), data)
      }
    })
    await t.test('发送原始请求体与认证头，保留 201 响应', async () => {
      setAccessToken('test-token')
      globalThis.fetch = async (_path, options) => {
        assert.equal(options?.method, 'POST')
        assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-token')
        assert.equal(new Headers(options?.headers).get('Content-Type'), 'application/json')
        assert.equal(options?.body, JSON.stringify({ title: '电影' }))
        return new Response(
          JSON.stringify({ code: 0, message: '操作成功', data: { id: 'created' } }),
          { status: 201 },
        )
      }
      assert.deepEqual(await http('/api/test', { method: 'POST', body: { title: '电影' } }), {
        id: 'created',
      })
    })
    await t.test('校验失败读取 data.fieldErrors，HTTP 200 非零 code 也会失败', async () => {
      for (const status of [400, 200]) {
        reply(
          {
            code: 400,
            message: '片名不能为空',
            data: { fieldErrors: { title: '必填', ignored: 123 } },
          },
          status,
        )
        await assert.rejects(http('/api/test'), (error: unknown) => {
          assert.ok(error instanceof ApiError)
          assert.equal(error.status, status)
          assert.equal(error.code, 400)
          assert.equal(error.message, '片名不能为空')
          assert.deepEqual(error.fieldErrors, { title: '必填' })
          return true
        })
      }
    })
    await t.test('真实 HTTP 错误不因 code=0 而成功，非标准成功响应不会冒充业务数据', async () => {
      reply({ code: 0, message: '错误响应', data: null }, 500)
      await assert.rejects(
        http('/api/test'),
        (error: unknown) => error instanceof ApiError && error.status === 500,
      )
      for (const body of [
        { id: 'old-format' },
        { code: 0, message: 123, data: null },
        { code: 0, message: '缺 data' },
      ]) {
        reply(body)
        await assert.rejects(http('/api/test'), /接口响应格式不正确/)
      }
      for (const response of [
        new Response('<html>错误</html>'),
        new Response(null, { status: 204 }),
      ]) {
        globalThis.fetch = async () => response
        await assert.rejects(http('/api/test'), /接口响应格式不正确/)
      }
    })
    await t.test('登录失败保留会话，受保护请求的 401 清除会话并通知', async () => {
      let notifications = 0
      setUnauthorizedHandler(() => {
        notifications++
      })
      setAccessToken('test-token')
      reply({ code: 401, message: '未登录', data: { fieldErrors: {} } }, 401)
      await assert.rejects(http('/api/login', { auth: false }), /未登录/)
      assert.equal(getAccessToken(), 'test-token')
      assert.equal(notifications, 0)
      await assert.rejects(http('/api/movies'), /未登录/)
      assert.equal(getAccessToken(), null)
      assert.equal(notifications, 1)
      setUnauthorizedHandler(null)
    })
  } finally {
    globalThis.fetch = originalFetch
    if (storageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
    await server.close()
  }
})
