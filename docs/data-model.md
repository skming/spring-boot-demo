# 数据模型

## 真相源

| 环境 | Schema 来源 |
|------|-------------|
| SQLite（默认） | `db/schema-sqlite.sql` 显式初始化；JPA `ddl-auto: none` |
| MySQL | Flyway：单一 `V1__init_schema.sql`，面向新的空教学库 |

MySQL 使用 8.4、InnoDB 与 utf8mb4。时间字段为 `datetime(6)`，主连接和 SQL 连接统一使用 UTC；类型标签保留 TEXT 加 JSON 结构检查，观看外键显式声明 `ON DELETE CASCADE`。审计 detail 在 MySQL 使用 LONGTEXT，避免长观看历史快照受 TEXT 的容量限制。MySQL profile 仅用于空的教学库，不提供旧库迁移或兼容。

## 表

### users

| 列 | 说明 |
|----|------|
| id | UUID，`varchar(36)` |
| email | 唯一 |
| password_hash | BCrypt，勿在演示 SQL 中默认选出 |
| created_at | 创建时间 |

### movies

| 列 | 说明 |
|----|------|
| id | UUID 字符串，便于 Lab 复制删除 |
| title | 片名，必填，最多 100 字符 |
| director | 导演，必填，最多 100 字符 |
| release_year | 发行年份，必填，1888–2100 之间的整数；与观看日期无关 |
| genres | JSON 字符串数组，TEXT 列；API 支持 1–8 个类型，每项最多 40 字符，去空格、去重、排序，例如 `["剧情","科幻"]` |
| notes | 电影备注 / 想看理由，最多 1000 字符 |
| owner_id | 归属用户；**观影记录页只查当前用户** |
| created_at / updated_at | 时间戳 |

### operation_logs

| 列 | 说明 |
|----|------|
| id | UUID |
| user_id | 操作者 |
| action | `AUTH_*` / `MOVIE_*` / `WATCH_*` / `LAB_SQL` / `LEARN_SQL` |
| resource_type | `auth` / `movie` / `lab` / `lesson` |
| resource_id | 可选 |
| detail | SQLite TEXT / MySQL LONGTEXT；SQL 原文或电影完整 JSON 快照，不截断 |
| success | 是否成功 |
| message | 结果说明 |
| created_at | 时间 |

## 关系

```text
users 1 ──< movies
movies 1 ──< watch_records
users 1 ──< operation_logs
```

## 教学注意

1. Lab `INSERT` 必须把 `owner_id` 设为当前登录用户，否则观影记录页查不到
2. `movies` 不存状态、评分或观影日期；状态由观看历史是否为空推导，最近评分/日期从最新观看读取
3. API 和 SQL 删除电影都会删除其观看记录；删除一次观看不会删除电影

`IsoDateConverter` 显式转换 `LocalDate` 与 ISO 文本，避免 SQLite JDBC 无法解析 SQL `CURRENT_DATE` 写入值。SQL 模板使用 `CAST(CURRENT_DATE AS VARCHAR(10))`，API 响应仍为标准日期字符串。API 按用户隔离，工作台是可写的本地教学入口，不提供行级权限隔离。

`GenresConverter` 使用标准 JSON 编解码，不再使用类型关联表。SQL 直接写入时应填写 1–8 个非空字符串组成的 JSON 数组，并保持去重排序；数据库检查 JSON 数组结构和数量，转换器检查元素内容。类型统计模板按类型组合分组，不把一部电影重复计数。

电影日志包含根字段 `ownerId`，以及 `before` / `after` 对象。新增的 `before` 为 null；删除的 `after` 为 null；更新保留修改前后完整字段。注册/登录日志不会保存密码或 Token。当前模型不包含历史表。

## watch_records

| 列 | 说明 |
|----|------|
| id | 本次观看的 UUID |
| movie_id | 所属影片，外键 `movies.id`，`ON DELETE CASCADE` |
| watched_on | 必填 ISO 日期，API 校验不晚于今天 |
| rating | 可空；有值时为 1–5 整数，数据库也限制范围 |
| notes | 本次观看笔记，最多 1000 字符 |
| created_at / updated_at | 本次记录的创建与修改时间 |

JPA 使用 `Movie.watchRecords` / `WatchRecord.movie` 双向关联，外键由子实体维护。移除集合元素使用 orphanRemoval，删除父实体使用级联删除；直接 SQL 的级联由数据库外键负责。观看归属仅从影片推导，不再重复存储 owner_id。

影片数按 movies 计算，观看次数按 watch_records 计算，平均分只统计非空评分。列表摘要按观看日期、创建时间、ID 倒序取第一条；补录旧日期不会覆盖较新的观影摘要。
