import type { SqlQueryResult } from './types/lab'

/** 写操作的结果行是汇总信息；是否影响记录只能依据 affectedRows。 */
export function sqlResultFeedback(result: SqlQueryResult) {
  const countLabel =
    result.affectedRows != null ? `影响 ${result.affectedRows} 行` : `${result.rowCount} 行`
  if (!result.auditRecorded) {
    return {
      state: 'audit-warning' as const,
      title: `${result.statementTypeLabel}已执行，日志未记录`,
      countLabel,
      description: `${countLabel} · ${result.durationMs} ms。请勿因日志故障重复执行写操作。${result.truncated ? '查询结果已截断。' : ''}`,
    }
  }
  if (result.affectedRows === 0) {
    const title = `${result.statementTypeLabel}未影响任何记录`
    const hint =
      result.statementType === 'INSERT'
        ? '请检查来源数据或写入条件。'
        : '请检查 WHERE 条件或目标记录是否存在。'
    return {
      state: 'no-change' as const,
      title,
      countLabel,
      description: `${countLabel} · ${result.durationMs} ms。${hint}`,
    }
  }
  return {
    state: 'success' as const,
    title: `${result.statementTypeLabel}完成`,
    countLabel,
    description: `${countLabel} · ${result.durationMs} ms`,
  }
}

/** 这是操作确认提示，不是 SQL 解析器或权限校验；真正的校验在后端 SqlGuard。 */
export function sqlConfirmation(sql: string): string | null {
  // 非明确 SELECT 的语句一律确认，WITH / 注释开头也不推测其是否只读。
  if (/^SELECT\b/i.test(sql.trim())) return null
  return '即将执行写入、执行计划或非普通查询。请核对完整 SQL，尤其是 UPDATE / DELETE 的 WHERE 范围；此操作可能修改数据。继续吗？'
}
