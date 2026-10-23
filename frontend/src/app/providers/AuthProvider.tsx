import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthResponse } from '../../features/auth/types/auth'
import { setUnauthorizedHandler } from '../../shared/api/http'
import {
  clearSession,
  getAccessToken,
  getSessionUser,
  setAccessToken,
  setSessionUser,
  type SessionUser,
} from '../../shared/api/session'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser())
  const [token, setToken] = useState<string | null>(() => getAccessToken())

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setToken(null)
    navigate('/auth', { replace: true })
  }, [navigate])

  const applyAuth = useCallback(
    (response: AuthResponse) => {
      const nextUser = { userId: response.userId, email: response.email }
      setAccessToken(response.accessToken)
      setSessionUser(nextUser)
      setToken(response.accessToken)
      setUser(nextUser)
      navigate('/movies', { replace: true })
    },
    [navigate],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setToken(null)
      navigate('/auth', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(token),
      applyAuth,
      logout,
    }),
    [applyAuth, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
