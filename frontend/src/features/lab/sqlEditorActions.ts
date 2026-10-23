import type { TableDetail, TableSummary } from './types/lab.ts'
import type { WatchStatusOption } from '../movie/types/movie.ts'

export const MAX_SQL_LENGTH = 5000

export type SqlExecution = {
  sql: string
  sourceSql: string
  scope: 'all' | 'selection'
}

/** 有选区时只执行选区；选中空白也不能回退为执行全文。 */
export function sqlExecution(sourceSql: string, selectedText: string | null): SqlExecution {
  return {
    sql: (selectedText ?? sourceSql).trim(),
    sourceSql,
    scope: selectedText === null ? 'all' : 'selection',
  }
}

export type SqlSuggestion = {
  label: string
  insertText: string
  kind: 'keyword' | 'table' | 'column' | 'value'
  detail: string
}

const KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER BY',
  'GROUP BY',
  'HAVING',
  'JOIN',
  'LEFT JOIN',
  'ON',
  'AS',
  'DISTINCT',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'IS NULL',
  'IS NOT NULL',
  'LIKE',
  'IN',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ASC',
  'DESC',
  'COUNT',
  'AVG',
  'SUM',
  'MIN',
  'MAX',
  'ROUND',
  'CURRENT_DATE',
  'CURRENT_TIMESTAMP',
]

export function sqlSuggestions(
  tables: TableSummary[],
  table: TableDetail | null,
  qualifier?: string,
  watchStatuses: WatchStatusOption[] = [],
): SqlSuggestion[] {
  const columns: SqlSuggestion[] = (table?.columns ?? []).map((column) => ({
    label: column.columnName,
    insertText: column.columnName,
    kind: 'column',
    detail: `${table!.tableName} · ${column.dataType} · ${column.nullable ? '可空' : '非空'}`,
  }))
  // 只识别明确的表名，不把任意别名猜成当前表。
  if (qualifier !== undefined)
    return qualifier.toLowerCase() === table?.tableName.toLowerCase() ? columns : []
  return [
    ...tables.map((item): SqlSuggestion => ({
      label: item.tableName,
      insertText: item.tableName,
      kind: 'table',
      detail: '数据表',
    })),
    ...columns,
    ...KEYWORDS.map((keyword): SqlSuggestion => ({
      label: keyword,
      insertText: keyword,
      kind: 'keyword',
      detail: 'SQL',
    })),
    ...watchStatuses.map(({ value, label }): SqlSuggestion => ({
      label: value,
      insertText: `'${value.replaceAll("'", "''")}'`,
      kind: 'value',
      detail: label,
    })),
  ]
}
