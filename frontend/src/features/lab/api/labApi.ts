import { http } from '../../../shared/api/http'
import type { SqlQueryRequest, SqlQueryResult, TableDetail, TableSummary } from '../types/lab'

export function listTables(): Promise<TableSummary[]> {
  return http<TableSummary[]>('/api/v1/lab/tables')
}

export function getTable(tableName: string): Promise<TableDetail> {
  return http<TableDetail>(`/api/v1/lab/tables/${encodeURIComponent(tableName)}`)
}

export function runQuery(request: SqlQueryRequest): Promise<SqlQueryResult> {
  return http<SqlQueryResult>('/api/v1/lab/query', {
    method: 'POST',
    body: request,
  })
}
