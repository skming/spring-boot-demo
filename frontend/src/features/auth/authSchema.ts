import { z } from 'zod'

const emailSchema = z
  .string({ error: '请输入邮箱' })
  .trim()
  .min(1, '请输入邮箱')
  .max(120, '邮箱最多 120 字符')
  .pipe(z.email({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: '邮箱格式不正确' }))

// 密码只校验，不 trim；首尾空格可能是密码的一部分。
const passwordSchema = z
  .string({ error: '请输入密码' })
  .min(1, '请输入密码')
  .max(72, '密码不能超过 72 位')
  .refine((value) => value.trim().length > 0, '请输入密码')

export const loginSchema = z.strictObject({ email: emailSchema, password: passwordSchema })
export const registerSchema = loginSchema.extend({
  password: passwordSchema.min(8, '密码至少 8 位'),
})

export type AuthCredentials = z.output<typeof loginSchema>
