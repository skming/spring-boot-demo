import { z } from 'zod'
import { localDate } from './movieView.ts'

export const watchRecordSchema = z.strictObject({
  watchedOn: z
    .string({ error: '请选择观影日期' })
    .min(1, '请选择观影日期')
    .pipe(z.iso.date({ error: '请选择有效的观影日期' }))
    .refine((value) => value <= localDate(), '观影日期不能晚于今天'),
  rating: z
    .number({ error: '评分须为 1–5 的整数' })
    .int('评分须为整数')
    .min(1, '评分不能低于 1 星')
    .max(5, '评分不能高于 5 星')
    .nullable(),
  notes: z.string().max(1000, '观影笔记最多 1000 字符').trim(),
})

export type WatchRecordInput = z.output<typeof watchRecordSchema>
