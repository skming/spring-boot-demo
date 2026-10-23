import { clearSession, getAccessToken } from './session'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type HttpOptions = {
  method?: HttpMethod
  body?: unknown
  auth?: boolean
}

export type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    isObject(value) &&
    Number.isInteger(value.code) &&
    typeof value.message === 'string' &&
    Object.hasOwn(value, 'data')
  )
}

export class ApiError extends Error {
  readonly status: number
  readonly code: number
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
    code = status,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers = new Headers()

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  const envelope = isApiResponse(data) ? data : null
  if (!response.ok || !envelope || envelope.code !== 0) {
    const message =
      envelope?.message.trim() ||
      (response.ok ? '接口响应格式不正确' : response.statusText || '请求失败')
    const details = envelope?.data
    const fields = isObject(details) && isObject(details.fieldErrors) ? details.fieldErrors : {}
    const fieldErrors = Object.fromEntries(
      Object.entries(fields).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )

    // 仅「需要登录的请求」遇到 401 才清会话；登录接口本身的 401 要展示业务错误
    if (response.status === 401 && auth) {
      clearSession()
      if (unauthorizedHandler) {
        unauthorizedHandler()
      } else if (window.location.pathname !== '/auth') {
        window.location.assign('/auth')
      }
    }

    throw new ApiError(message, response.status, fieldErrors, envelope?.code || response.status)
  }

  return envelope.data as T
}
