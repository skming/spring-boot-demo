import { http } from '../../../shared/api/http'
import type { AuthCredentials, AuthResponse } from '../types/auth'

export function register(credentials: AuthCredentials): Promise<AuthResponse> {
  return http<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: credentials,
    auth: false,
  })
}

export function login(credentials: AuthCredentials): Promise<AuthResponse> {
  return http<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
  })
}
