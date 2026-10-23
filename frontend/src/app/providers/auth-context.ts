import { createContext, useContext } from 'react'
import type { AuthResponse } from '../../features/auth/types/auth'
import type { SessionUser } from '../../shared/api/session'

export type AuthContextValue = {
  user: SessionUser | null
  isAuthenticated: boolean
  applyAuth: (response: AuthResponse) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
