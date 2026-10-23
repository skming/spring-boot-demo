import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { setImmediate } from 'node:timers/promises'
import {
  appendSqlHistory,
  filterResultRows,
  resultRowsJson,
  type SqlHistoryEntry,
} from '../src/features/lab/workbench.ts'
import type { SqlQueryResult } from '../src/features/lab/types/lab.ts'

const result: SqlQueryResult = {
  statementType: 'SELECT',
  statementTypeLabel: '查询',
  affectedRows: null,
  columns: ['title', 'rating', 'notes'],
  rowCount: 3,
  durationMs: 1,
  truncated: true,
  auditRecorded: true,
  rows: [
    { title: '星际穿越', rating: 5, notes: null, hidden: 'secret' },
    { title: 'Movie', rating: 0, notes: { text: '笔记' } },
    { title: '空白', rating: null, notes: '' },
  ],
}

test('result search only filters returned columns without mutating data or execution counts', () => {
  const original = structuredClone(result)
  assert.equal(filterResultRows(result, '  '), result.rows)
  assert.deepEqual(filterResultRows(result, '星际'), [result.rows[0]])
  assert.deepEqual(filterResultRows(result, ' movie '), [result.rows[1]])
  assert.deepEqual(filterResultRows(result, '笔记'), [result.rows[1]])
  assert.deepEqual(filterResultRows(result, 'NULL'), [result.rows[0], result.rows[2]])
  assert.deepEqual(filterResultRows(result, '0'), [result.rows[1]])
  assert.deepEqual(filterResultRows(result, 'secret'), [])
  assert.deepEqual(filterResultRows({ ...result, rows: [] }, 'movie'), [])
  assert.deepEqual(filterResultRows({ ...result, columns: [] }, 'movie'), [])
  assert.deepEqual(result, original)
})

test('copied result JSON uses visible rows and declared columns, preserving null and structured values', () => {
  const rows = filterResultRows(result, 'movie')
  assert.deepEqual(JSON.parse(resultRowsJson(result.columns, rows)), [
    { title: 'Movie', rating: 0, notes: { text: '笔记' } },
  ])
  assert.equal(resultRowsJson(result.columns, []), '[]')
  assert.deepEqual(JSON.parse(resultRowsJson(['notes', 'missing'], [{ notes: '' }])), [
    { notes: '', missing: null },
  ])
  assert.ok(!resultRowsJson(result.columns, result.rows).includes('secret'))
})

test('history keeps actual repeated requests and all outcomes, newest first with a 20-entry limit', () => {
  let entries: SqlHistoryEntry[] = []
  for (let id = 1; id <= 23; id++) {
    const before = [...entries]
    const entry: SqlHistoryEntry = {
      id,
      sql: "DELETE FROM movies WHERE id = '1'",
      scope: id % 2 ? 'selection' : 'all',
      time: '12:00:00',
      outcome: id % 3 === 0 ? 'error' : id % 3 === 1 ? 'warning' : 'success',
      summary: '结果',
    }
    const next = appendSqlHistory(entries, entry)
    assert.deepEqual(entries, before)
    assert.equal(next[0], entry)
    entries = next
  }
  assert.equal(entries.length, 20)
  assert.deepEqual(
    entries.map((entry) => entry.id),
    Array.from({ length: 20 }, (_, index) => 23 - index),
  )
  assert.deepEqual(
    new Set(entries.map((entry) => entry.outcome)),
    new Set(['success', 'warning', 'error']),
  )
})

test('history controls render accessible load-only actions and do not execute during rendering', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  try {
    const { SqlHistory } = await server.ssrLoadModule('/src/features/lab/components/SqlHistory.tsx')
    let calls = 0
    const props = {
      entries: [
        {
          id: 1,
          sql: 'SELECT 1',
          scope: 'selection',
          time: '12:00:00',
          outcome: 'success',
          summary: '查询完成',
        },
      ],
      disabled: false,
      onLoad: () => {
        calls++
      },
      onClear: () => {
        calls++
      },
    }
    const markup = renderToStaticMarkup(createElement(SqlHistory, props))
    assert.match(markup, /aria-label="最近执行记录"/)
    assert.match(markup, /aria-label="载入 SQL：SELECT 1"/)
    assert.match(markup, /点击载入，不会执行/)
    assert.match(markup, /查询完成/)
    const disabled = renderToStaticMarkup(createElement(SqlHistory, { ...props, disabled: true }))
    assert.equal((disabled.match(/<button\b[^>]* disabled=""/g) ?? []).length, 2)
    const empty = renderToStaticMarkup(createElement(SqlHistory, { ...props, entries: [] }))
    assert.match(empty, /暂无执行记录/)
    assert.equal(calls, 0)
  } finally {
    await server.close()
  }
})

test('workbench loads history without executing and still confirms writes and prevents duplicate requests', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    plugins: [
      {
        name: 'workbench-action-fixture',
        enforce: 'pre',
        transform(source, id) {
          if (!id.split('?')[0].endsWith('/features/lab/pages/LabPage.tsx')) return
          return source.replace(
            /from (["'])(?:react-router-dom|\.\.\/\.\.\/\.\.\/app\/providers\/(?:auth-context|confirm-context)|\.\.\/api\/labApi|\.\.\/components\/(?:SqlEditor|SqlHistory)|\.\.\/\.\.\/movie\/hooks\/useWatchStatuses)\1/g,
            "from 'workbench-test-runtime'",
          )
        },
        resolveId(id) {
          if (id === 'workbench-test-runtime') return '\0workbench-test-runtime'
        },
        load(id) {
          if (id !== '\0workbench-test-runtime') return
          return `
          export const fixture = { editor: null, history: null, requests: [], confirmations: [], answer: false, query: null };
          export const useAuth = () => ({ user: { userId: '11111111-1111-4111-8111-111111111111' } });
          export const useLocation = () => ({ state: null });
          export const useConfirm = () => async (options) => { fixture.confirmations.push(options); return fixture.answer; };
          export const useWatchStatuses = () => ({ watchStatuses: [], refreshWatchStatuses() {} });
          export const listTables = async () => [];
          export const getTable = async () => null;
          export const runQuery = (request) => { fixture.requests.push(request); return fixture.query(request); };
          export const SqlEditor = (props) => { fixture.editor = props; return null; };
          export const SqlHistory = (props) => { fixture.history = props; return null; };
        `
        },
      },
    ],
  })
  try {
    const { LabPage } = await server.ssrLoadModule('/src/features/lab/pages/LabPage.tsx')
    const { fixture } = await server.ssrLoadModule('workbench-test-runtime')
    renderToStaticMarkup(createElement(LabPage))
    const entry: SqlHistoryEntry = {
      id: 1,
      sql: "DELETE FROM movies WHERE id = '1'",
      scope: 'selection',
      time: '12:00:00',
      outcome: 'warning',
      summary: '影响 0 行',
    }
    fixture.history.onLoad(entry)
    await setImmediate()
    assert.equal(fixture.confirmations[0].title, '载入历史 SQL？')
    assert.equal(fixture.requests.length, 0)
    fixture.answer = true
    fixture.history.onLoad(entry)
    await setImmediate()
    assert.equal(fixture.requests.length, 0)

    fixture.answer = false
    const execution = { sql: entry.sql, sourceSql: `SELECT 1;\n${entry.sql}`, scope: 'selection' }
    fixture.editor.onRun(execution)
    await setImmediate()
    assert.equal(fixture.confirmations.at(-1).title, '确认执行 SQL？')
    assert.equal(fixture.requests.length, 0)

    const pending = Promise.withResolvers()
    fixture.query = () => pending.promise
    fixture.answer = true
    fixture.editor.onRun(execution)
    await setImmediate()
    fixture.editor.onRun(execution)
    await setImmediate()
    assert.deepEqual(fixture.requests, [{ sql: entry.sql }])
    pending.resolve({
      ...result,
      statementType: 'DELETE',
      statementTypeLabel: '删除',
      affectedRows: 0,
    })
    await setImmediate()
    fixture.query = async () => {
      throw new Error('SQL rejected')
    }
    fixture.editor.onRun(execution)
    await setImmediate()
    assert.equal(fixture.requests.length, 2)
    fixture.query = async () => result
    fixture.editor.onRun({ sql: 'SELECT 1', sourceSql: 'SELECT 1', scope: 'all' })
    await setImmediate()
    assert.equal(fixture.requests.length, 3)
  } finally {
    await server.close()
  }
})
