import type { SqlQueryResult } from './types/lab.ts'
import type { SqlExecution } from './sqlEditorActions.ts'

export type SqlHistoryEntry = {
  id: number
  sql: string
  scope: SqlExecution['scope']
  time: string
  outcome: 'success' | 'warning' | 'error'
  summary: string
}

/** 只在当前页面保留最近 20 次请求，不持久化 SQL 或查询数据。 */
export function appendSqlHistory(
  entries: SqlHistoryEntry[],
  entry: SqlHistoryEntry,
): SqlHistoryEntry[] {
  return [entry, ...entries].slice(0, 20)
}

export function filterResultRows(result: SqlQueryResult, search: string): SqlQueryResult['rows'] {
  const query = search.trim().toLocaleLowerCase()
  if (!query) return result.rows
  return result.rows.filter((row) =>
    result.columns.some((column) => {
      const value = row[column]
      const text =
        value == null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value) : String(value)
      return text.toLocaleLowerCase().includes(query)
    }),
  )
}

export function resultRowsJson(columns: string[], rows: SqlQueryResult['rows']): string {
  return JSON.stringify(
    rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? null]))),
    null,
    2,
  )
}
