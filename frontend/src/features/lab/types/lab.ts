export type TableSummary = {
  tableName: string
  tableType: string
}

export type ColumnInfo = {
  columnName: string
  dataType: string
  nullable: boolean
  defaultValue: string | null
}

export type TableDetail = {
  tableName: string
  columns: ColumnInfo[]
  primaryKeys: string[]
  indexes: string[]
}

export type SqlQueryResult = {
  statementType: string
  statementTypeLabel: string
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  affectedRows: number | null
  truncated: boolean
  durationMs: number
  auditRecorded: boolean
}

export type SqlQueryRequest = {
  sql: string
}
