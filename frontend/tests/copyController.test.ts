import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCopyController, type CopyFeedback } from '../src/shared/clipboard/copyController.ts'

test('successful copy changes pending to copied and restores the icon after 1800 ms', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const feedback: CopyFeedback[] = []
  const written: string[] = []
  const controller = createCopyController(
    async (text) => {
      written.push(text)
    },
    (state) => feedback.push(state),
    () => assert.fail('Unexpected error'),
  )
  await controller.copy('SELECT 1')
  assert.deepEqual(written, ['SELECT 1'])
  assert.deepEqual(feedback, [
    { copying: true, copiedText: null },
    { copying: false, copiedText: 'SELECT 1' },
  ])
  context.mock.timers.tick(1799)
  assert.equal(feedback.at(-1)?.copiedText, 'SELECT 1')
  context.mock.timers.tick(1)
  assert.deepEqual(feedback.at(-1), { copying: false, copiedText: null })
  controller.dispose()
})

test('failure reports an error without showing successful copy feedback', async () => {
  const feedback: CopyFeedback[] = []
  let errors = 0
  const controller = createCopyController(
    async () => {
      throw new Error('denied')
    },
    (state) => feedback.push(state),
    () => {
      errors++
    },
  )
  await controller.copy('SELECT 1')
  assert.equal(errors, 1)
  assert.deepEqual(feedback, [
    { copying: true, copiedText: null },
    { copying: false, copiedText: null },
  ])
  controller.dispose()
})

test('duplicate clicks do not start concurrent clipboard writes and empty text is ignored', async () => {
  let finish!: () => void
  let writes = 0
  const controller = createCopyController(
    () => {
      writes++
      return new Promise<void>((resolve) => {
        finish = resolve
      })
    },
    () => {},
    () => {},
  )
  await controller.copy('')
  assert.equal(writes, 0)
  const first = controller.copy('SELECT 1')
  await controller.copy('SELECT 2')
  assert.equal(writes, 1)
  finish()
  await first
  controller.dispose()
})

test('disposing cancels timers and ignores clipboard completion after unmount', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const feedback: CopyFeedback[] = []
  let finish!: () => void
  const controller = createCopyController(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    (state) => feedback.push(state),
    () => assert.fail(),
  )
  const copying = controller.copy('SELECT 1')
  controller.dispose()
  finish()
  await copying
  assert.equal(feedback.length, 1)
  const again = controller.copy('SELECT 2')
  finish()
  await again
  assert.equal(feedback.at(-1)?.copiedText, 'SELECT 2')
  controller.dispose()
  context.mock.timers.tick(1800)
  assert.equal(feedback.at(-1)?.copiedText, 'SELECT 2')
})
