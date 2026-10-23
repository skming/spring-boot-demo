import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createConfirmController,
  type ConfirmOptions,
} from '../src/app/providers/confirmController.ts'

test('confirmation only accepts an explicit positive answer and ignores repeated settle calls', async () => {
  const displayed: Array<ConfirmOptions | null> = []
  const controller = createConfirmController((options) => displayed.push(options))
  const options = { title: '删除记录？', description: '无法撤销', danger: true }
  const cancel = controller.request(options)
  assert.deepEqual(displayed.at(-1), options)
  controller.settle(false)
  assert.equal(await cancel, false)
  const accept = controller.request(options)
  controller.settle(true)
  controller.settle(false)
  assert.equal(await accept, true)
  assert.equal(displayed.at(-1), null)
})

test('a pending dialog cannot be replaced and disposal cancels pending work', async () => {
  const controller = createConfirmController(() => {})
  const first = controller.request({ title: '确认', description: 'first' })
  assert.equal(await controller.request({ title: '确认', description: 'second' }), false)
  controller.dispose()
  assert.equal(await first, false)
  const next = controller.request({ title: '确认', description: 'next' })
  controller.settle(false)
  assert.equal(await next, false)
})
