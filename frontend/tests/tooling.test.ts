import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const executable = (name: string) =>
  join(frontend, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)

test('Oxlint rejects key mistakes previously checked by ESLint', () => {
  const directory = mkdtempSync(join(tmpdir(), 'db-lab-lint-'))
  try {
    const cases = [
      [
        'hooks',
        'rules-of-hooks',
        `import { useState } from 'react';
        export function Example({ enabled }: { enabled: boolean }) {
          if (enabled) { useState(0) }
          return null
        }`,
      ],
      [
        'deps',
        'exhaustive-deps',
        `import { useEffect } from 'react';
        export function Example({ value }: { value: string }) {
          useEffect(() => { console.log(value) }, [])
          return null
        }`,
      ],
      [
        'effect',
        'set-state-in-effect',
        `import { useEffect, useState } from 'react';
        export function Example() {
          const [value, setValue] = useState(0)
          useEffect(() => { setValue(1) }, [])
          return <span>{value}</span>
        }`,
      ],
      [
        'refresh',
        'only-export-components',
        `export const helper = () => 1;
        export function Example() { return <div /> }`,
      ],
      ['any', 'no-explicit-any', 'export const value: any = 1'],
      ['debugger', 'no-debugger', 'debugger;'],
    ]
    for (const [name, rule, code] of cases) {
      const path = join(directory, `${name}.tsx`)
      writeFileSync(path, code)
      const result = spawnSync(
        executable('oxlint'),
        ['-c', '.oxlintrc.json', '--format=json', path],
        { cwd: frontend, encoding: 'utf8' },
      )
      assert.equal(result.error, undefined)
      assert.notEqual(result.status, 0, `${rule} must reject invalid code`)
      const diagnostics = JSON.parse(result.stdout).diagnostics
      assert.ok(
        diagnostics.some((diagnostic: { code: string }) => diagnostic.code.includes(rule)),
        `${rule}: ${result.stdout} ${result.stderr}`,
      )
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Oxfmt check is non-mutating and write produces stable project formatting', () => {
  const directory = mkdtempSync(join(tmpdir(), 'db-lab-format-'))
  const path = join(directory, 'example.ts')
  const run = (mode: string) =>
    spawnSync(executable('oxfmt'), ['-c', '.oxfmtrc.json', mode, path], {
      cwd: frontend,
      encoding: 'utf8',
    })
  try {
    const original = 'const value={a:"hello"};\n'
    writeFileSync(path, original)
    const before = run('--check')
    assert.equal(before.error, undefined)
    assert.notEqual(before.status, 0)
    assert.equal(readFileSync(path, 'utf8'), original)
    const formatted = run('--write')
    assert.equal(formatted.status, 0, formatted.stdout + formatted.stderr)
    assert.equal(readFileSync(path, 'utf8'), "const value = { a: 'hello' }\n")
    assert.equal(run('--check').status, 0)
    assert.equal(run('--write').status, 0)
    assert.equal(readFileSync(path, 'utf8'), "const value = { a: 'hello' }\n")
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
