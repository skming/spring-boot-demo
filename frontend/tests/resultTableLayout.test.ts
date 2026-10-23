import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('SQL result shapes keep headers and cells aligned, and expanded logs span all columns', async () => {
  const log = {
    id: 'log-layout-test',
    action: 'WATCH_CREATE',
    success: true,
    resourceType: 'movie',
    resourceId: 'movie-id',
    detail: JSON.stringify({ after: { title: '电影', notes: '完整观影笔记' } }),
    message: 'saved',
    createdAt: '2026-10-21T00:00:00Z',
  }
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    plugins: [
      {
        name: 'expanded-log-layout-fixture',
        enforce: 'pre',
        transform(source, id) {
          if (!id.split('?')[0].endsWith('/features/log/pages/OperationLogPage.tsx')) return
          // 给 SSR 注入已加载且展开的日志，不发 HTTP 请求，也不替换 HeroUI Table。
          return source
            .replace(
              'useState<OperationLog[]>([])',
              `useState<OperationLog[]>([${JSON.stringify(log)}])`,
            )
            .replace('useState(true)', 'useState(false)')
            .replace(
              'useState<Selection>(() => new Set())',
              `useState<Selection>(() => new Set(['${log.id}']))`,
            )
        },
      },
    ],
  })
  try {
    const { SqlResultTable } = await server.ssrLoadModule(
      '/src/features/lab/components/SqlResultTable.tsx',
    )
    const result = {
      statementType: 'SELECT',
      statementTypeLabel: '查询',
      rowCount: 1,
      affectedRows: null,
      truncated: false,
      durationMs: 1,
      auditRecorded: true,
    }
    // 覆盖 SELECT / DML、列数变化、同列不同值、空行、空列与重复列名。
    const cases = [
      {
        columns: ['title', 'rating'],
        rows: [
          { title: '电影', rating: 5 },
          { title: '第二部', rating: 4 },
          { title: '第三部', rating: 3 },
        ],
      },
      { columns: ['count'], rows: [{ count: 3 }] },
      {
        columns: ['title', 'rating', 'notes'],
        rows: [{ title: '电影', rating: null, notes: { text: '笔记' } }],
      },
      { columns: ['title', 'rating'], rows: [{ title: '更新后的电影', rating: 2 }] },
      {
        columns: ['affected_rows', 'statement'],
        rows: [{ affected_rows: 0, statement: 'DELETE' }],
      },
      { columns: ['title', 'rating'], rows: [] },
      { columns: ['title', 'title'], rows: [{ title: '重复别名' }] },
    ]
    for (const shape of cases) {
      const markup = renderToStaticMarkup(
        createElement(SqlResultTable, { result: { ...result, ...shape }, label: '测试 SQL 结果' }),
      )
      const head = markup.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/)?.[1] ?? ''
      assert.equal((head.match(/<th\b/g) ?? []).length, shape.columns.length)
      const body = markup.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
      if (shape.rows.length)
        assert.equal(
          (body.match(/<(?:td|th)\b/g) ?? []).length,
          shape.columns.length * shape.rows.length,
        )
      else assert.match(body, /查询没有匹配行/)
      if (shape.rows[0]?.title === '更新后的电影') assert.match(body, /更新后的电影/)
    }
    const noColumns = renderToStaticMarkup(
      createElement(SqlResultTable, {
        result: { ...result, columns: [], rows: [{ hidden: 'value' }] },
        label: '空列',
      }),
    )
    assert.match(noColumns, /查询结果没有列信息/)
    assert.doesNotMatch(noColumns, /<table\b/)

    const { OperationLogPage } = await server.ssrLoadModule(
      '/src/features/log/pages/OperationLogPage.tsx',
    )
    const logs = renderToStaticMarkup(createElement(OperationLogPage))
    const expandedRow = (logs.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? []).find((row) =>
      row.includes('操作详情'),
    )
    assert.ok(expandedRow, 'The real expanded log row must render')
    assert.match(expandedRow, /colspan="5"/)
    assert.equal((expandedRow.match(/<(?:td|th)\b/g) ?? []).length, 1)
    assert.match(expandedRow, /完整观影笔记/)
  } finally {
    await server.close()
  }
})
