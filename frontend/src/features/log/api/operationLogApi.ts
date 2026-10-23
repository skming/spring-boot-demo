import { http } from '../../../shared/api/http'
import type { OperationLogPage, OperationLogQuery, OperationLogStats } from '../types/operationLog'

export function listOperationLogs(query: OperationLogQuery = {}) {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 0))
  params.set('size', String(query.size ?? 10))
  if (query.success !== undefined) {
    params.set('success', String(query.success))
  }
  return http<OperationLogPage>(`/api/v1/operation-logs?${params.toString()}`)
}

export function fetchOperationLogStats() {
  return http<OperationLogStats>('/api/v1/operation-logs/stats')
}
