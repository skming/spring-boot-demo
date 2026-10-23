import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loginSchema, registerSchema } from '../src/features/auth/authSchema.ts'

const credentials = { email: 'viewer@example.com', password: 'password-123' }

test('auth schemas trim emails but never change password content', () => {
  for (const schema of [loginSchema, registerSchema]) {
    assert.deepEqual(
      schema.parse({ email: '  viewer@example.com  ', password: ' password-123 ' }),
      { email: 'viewer@example.com', password: ' password-123 ' },
    )
    assert.equal(schema.safeParse({ ...credentials, password: 'x'.repeat(72) }).success, true)
    assert.equal(schema.safeParse({ ...credentials, password: 'x'.repeat(73) }).success, false)
    for (const password of ['', ' \t\n'])
      assert.equal(schema.safeParse({ ...credentials, password }).success, false)
  }
})

test('login accepts existing short passwords while registration requires eight characters', () => {
  assert.equal(loginSchema.safeParse({ ...credentials, password: 'x' }).success, true)
  assert.equal(registerSchema.safeParse({ ...credentials, password: 'x'.repeat(7) }).success, false)
  assert.equal(registerSchema.safeParse({ ...credentials, password: 'x'.repeat(8) }).success, true)
})

test('auth schemas enforce required fields, email format and length, and reject unknown inputs', () => {
  for (const schema of [loginSchema, registerSchema]) {
    for (const email of [
      '',
      '  ',
      'not-email',
      'name@domain',
      'name @example.com',
      'a'.repeat(109) + '@example.com',
    ]) {
      assert.equal(schema.safeParse({ ...credentials, email }).success, false)
    }
    assert.equal(
      schema.safeParse({ ...credentials, email: 'a'.repeat(108) + '@example.com' }).success,
      true,
    )
    for (const field of ['email', 'password']) {
      const input: Record<string, unknown> = { ...credentials }
      delete input[field]
      assert.equal(schema.safeParse(input).success, false)
      assert.equal(schema.safeParse({ ...credentials, [field]: null }).success, false)
    }
    assert.equal(schema.safeParse({ ...credentials, userId: 'untrusted-id' }).success, false)
  }
})
