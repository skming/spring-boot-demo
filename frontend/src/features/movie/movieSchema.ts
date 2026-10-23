import { z } from 'zod'

export const MIN_RELEASE_YEAR = 1888
export const MAX_RELEASE_YEAR = 2100

export const releaseYearSchema = z
  .number({ error: '请填写发行年份' })
  .int('发行年份须为整数')
  .min(MIN_RELEASE_YEAR, '发行年份不能早于 1888 年')
  .max(MAX_RELEASE_YEAR, '发行年份不能晚于 2100 年')

export const movieInputSchema = z.strictObject({
  title: z.string().max(100, '片名最多 100 字符').trim().min(1, '请填写片名'),
  director: z.string().max(100, '导演最多 100 字符').trim().min(1, '请填写导演'),
  releaseYear: releaseYearSchema,
  genres: z
    .array(z.string().max(40, '每个类型最多 40 字符').trim().min(1, '电影类型不能为空'))
    .min(1, '请至少选择一个类型')
    .max(8, '最多选择 8 个类型'),
  notes: z.string().max(1000, '电影备注最多 1000 字符').trim(),
})

export type MoviePayload = z.output<typeof movieInputSchema>
