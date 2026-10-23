// 观影库是新的教学数据集，不复用旧任务库的浏览器登录状态。
const ACCESS_TOKEN_KEY = 'dblab.cinema.accessToken'
const USER_KEY = 'dblab.cinema.user'

export type SessionUser = {
  userId: string
  email: string
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getSessionUser(): SessionUser | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function setSessionUser(user: SessionUser): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSessionUser(): void {
  sessionStorage.removeItem(USER_KEY)
}

export function clearSession(): void {
  clearAccessToken()
  clearSessionUser()
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
