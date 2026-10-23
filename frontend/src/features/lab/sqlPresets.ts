export type SqlPreset = { label: string; sql: string; hint: string }

export const DEFAULT_SQL = `SELECT m.id, m.title, m.genres, COUNT(w.id) AS viewing_count, m.owner_id
FROM movies m
LEFT JOIN watch_records w ON w.movie_id = m.id
GROUP BY m.id, m.title, m.genres, m.owner_id, m.updated_at
ORDER BY m.updated_at DESC, m.id DESC
LIMIT 20`

export function buildSqlPresets(ownerId: string | null | undefined): SqlPreset[] {
  const owner = ownerId?.trim() ?? ''
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)
  const literal = valid ? `'${owner}'` : 'NULL'
  const presets: SqlPreset[] = [
    { label: '查询列表', hint: '电影与观看次数，未看影片也会保留', sql: DEFAULT_SQL },
    {
      label: '我的片单',
      hint: '按当前用户过滤',
      sql: `SELECT id, title, genres, notes, updated_at
FROM movies WHERE owner_id = ${literal}
ORDER BY updated_at DESC, id DESC LIMIT 20`,
    },
    {
      label: '按状态统计',
      hint: '通过观影记录推导状态，不重复存储',
      sql: `SELECT
  CASE WHEN EXISTS (SELECT 1 FROM watch_records w WHERE w.movie_id = m.id)
    THEN 'WATCHED' ELSE 'WANT_TO_WATCH' END AS watch_status,
  COUNT(*) AS movie_count
FROM movies m WHERE m.owner_id = ${literal}
GROUP BY CASE WHEN EXISTS (SELECT 1 FROM watch_records w WHERE w.movie_id = m.id)
  THEN 'WATCHED' ELSE 'WANT_TO_WATCH' END`,
    },
    {
      label: '类型偏好',
      hint: '电影数去重，平均分按观看次数计算',
      sql: `SELECT m.genres,
  COUNT(DISTINCT m.id) AS movie_count, COUNT(w.id) AS viewing_count,
  ROUND(AVG(w.rating), 1) AS average_rating
FROM movies m LEFT JOIN watch_records w ON w.movie_id = m.id
WHERE m.owner_id = ${literal}
GROUP BY m.genres ORDER BY movie_count DESC`,
    },
    {
      label: '我的高分片',
      hint: '每次观看独立评分，未评分不参与排名',
      sql: `SELECT m.title, w.rating, w.watched_on, w.notes
FROM movies m JOIN watch_records w ON w.movie_id = m.id
WHERE m.owner_id = ${literal} AND w.rating IS NOT NULL
ORDER BY w.rating DESC, w.watched_on DESC, w.id DESC LIMIT 10`,
    },
    {
      label: '关联用户',
      hint: '只查询邮箱，不读取密码哈希',
      sql: `SELECT m.title, u.email AS owner_email
FROM movies m JOIN users u ON u.id = m.owner_id
WHERE m.owner_id = ${literal} ORDER BY m.updated_at DESC LIMIT 20`,
    },
    {
      label: '新增一条',
      hint: '新增影片资料，不自动产生观看记录',
      sql: `INSERT INTO movies (id, title, director, release_year, genres, notes, owner_id, created_at, updated_at)
VALUES ('${valid ? crypto.randomUUID() : ''}', 'SQL观影演示', '教学导演', 2014, '["科幻"]', '想看理由', ${literal}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    },
    {
      label: '记录一次观影',
      hint: '为自己的演示电影添加观看记录，可反复执行',
      sql: `INSERT INTO watch_records (id, movie_id, watched_on, rating, notes, created_at, updated_at)
SELECT '${valid ? crypto.randomUUID() : ''}', id, CAST(CURRENT_DATE AS VARCHAR(10)), 5, '这次观影的感想', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM movies WHERE title = 'SQL观影演示' AND owner_id = ${literal} LIMIT 1`,
    },
    {
      label: '更新演示行',
      hint: '修改电影资料，不覆盖观看历史',
      sql: `UPDATE movies SET notes = '修改后的电影备注', updated_at = CURRENT_TIMESTAMP
WHERE title = 'SQL观影演示' AND owner_id = ${literal}`,
    },
    {
      label: '按 id 删除',
      hint: '删除影片及其全部观影记录',
      sql: `DELETE FROM movies WHERE id = (
  SELECT id FROM movies WHERE title = 'SQL观影演示' AND owner_id = ${literal} LIMIT 1
)`,
    },
    {
      label: '删除演示行',
      hint: '按标题和当前用户删除',
      sql: `DELETE FROM movies WHERE title = 'SQL观影演示' AND owner_id = ${literal}`,
    },
    {
      label: '查看操作日志',
      hint: '查看操作快照与实际执行结果',
      sql: `SELECT action, resource_type, detail, success, message, created_at
FROM operation_logs ORDER BY created_at DESC LIMIT 20`,
    },
  ]
  return valid
    ? presets
    : presets.filter(
        (preset) => !/^(INSERT|UPDATE|DELETE)/.test(preset.sql) && preset.label !== '我的片单',
      )
}
