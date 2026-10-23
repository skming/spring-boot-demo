import { Table } from '@heroui/react'
import { useMemo, type ReactNode } from 'react'
import type { SqlQueryResult } from '../types/lab'

type Props = {
  result: SqlQueryResult
  label: string
  renderCell?: (column: string, value: unknown) => ReactNode
}

/** 按同一组动态列渲染结果，行列 ID 使用不同前缀。 */
export function SqlResultTable({ result, label, renderCell }: Props) {
  const columns = useMemo(
    () => result.columns.map((name, index) => ({ id: `column-${index}`, name, index })),
    [result.columns],
  )
  const rows = useMemo(
    () => result.rows.map((values, index) => ({ id: `row-${index}`, values })),
    [result.rows],
  )
  if (!columns.length)
    return (
      <p role="status" className="p-4 text-sm text-muted">
        查询结果没有列信息。
      </p>
    )
  return (
    <Table key={JSON.stringify(result.columns)} variant="secondary">
      <Table.ScrollContainer className="max-h-full">
        <Table.Content aria-label={label} className="min-w-[480px]">
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column id={column.id} isRowHeader={column.index === 0}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={rows}
            dependencies={[columns, renderCell]}
            renderEmptyState={() => <span className="text-muted">查询没有匹配行。</span>}
          >
            {(row) => (
              <Table.Row id={row.id} columns={columns} dependencies={[row.values, renderCell]}>
                {(column) => (
                  <Table.Cell>
                    {renderCell ? (
                      renderCell(column.name, row.values[column.name])
                    ) : (
                      <span className="whitespace-pre-wrap break-all font-mono text-xs">
                        {row.values[column.name] == null
                          ? 'NULL'
                          : typeof row.values[column.name] === 'object'
                            ? JSON.stringify(row.values[column.name])
                            : String(row.values[column.name])}
                      </span>
                    )}
                  </Table.Cell>
                )}
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
