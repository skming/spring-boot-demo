# API 对照

现行契约以 Controller 与前端 `*Api.ts` 为准。

## 统一响应

所有 `/api/v1` JSON 接口使用 `code`、`message`、`data`：

```json
{"code":0,"message":"操作成功","data":{"id":"...","title":"电影"}}
```

`code=0` 表示成功；失败时 code 为 HTTP 错误状态码，message 为错误提示，data 包含 `timestamp`、`path`、`fieldErrors`。例如：

```json
{"code":400,"message":"片名不能为空","data":{"timestamp":"2026-10-21T00:00:00Z","path":"/api/v1/movies","fieldErrors":{"title":"片名不能为空"}}}
```

HTTP 状态码仍有意义：新增返回 201，普通成功返回 200，错误保留 400/401/403/404 等。删除影片与重置实验库返回 200，data 为 null。列表数组、分页对象和枚举选项均放在 data 中。前端 `shared/api/http.ts` 统一解包，各功能 API 返回业务数据；错误抛出 `ApiError`，表单通过其 fieldErrors 读取校验提示。Actuator 健康检查保持框架原有格式。

除注册/登录外，均需：

```http
Authorization: Bearer <accessToken>
```

## Auth

| 方法 | 路径 | 前端 | 后端 | 表 |
|------|------|------|------|----|
| POST | `/api/v1/auth/register` | `features/auth/api/authApi.ts` | `AuthController` | `users` + 日志 |
| POST | `/api/v1/auth/login` | 同上 | 同上 | `users` + 日志 |

## Movies

| 方法 | 路径 | 前端 | 后端 | 表 |
|------|------|------|------|----|
| GET | `/api/v1/movies` | `features/movie/api/movieApi.ts` | `MovieController` | `movies`（按 owner） |
| POST | `/api/v1/movies` | 同上 | 同上 | `movies` + 日志 |
| GET | `/api/v1/movies/{id}` | （可选） | 同上 | `movies` |
| PUT | `/api/v1/movies/{id}` | 同上 | 同上 | `movies` + 日志 |
| DELETE | `/api/v1/movies/{id}` | 同上 | 同上 | `movies` + 日志 |
| GET | `/api/v1/movies/watch-statuses` | 同上 | 同上 | 状态枚举选项 |
| POST | `/api/v1/movies/{id}/watch-records` | 同上 | 同上 | 新增一次观看及审计 |
| PUT | `/api/v1/movies/{id}/watch-records/{recordId}` | 同上 | 同上 | 编辑一次观看及审计 |
| DELETE | `/api/v1/movies/{id}/watch-records/{recordId}` | 同上 | 同上 | 删除一次观看及审计 |

影片新增与更新使用 `MovieRequest`：必填的 `title`、`director`、`releaseYear`、`genres`，以及选填的 `notes`。发行年份为 1888–2100 之间的整数，缺失、null、小数或越界返回 400；单条、列表及审计快照均包含数字 `releaseYear`。类型为 1–8 个非空字符串，每项最多 40 字符，服务端去空格、去重、排序。观看使用 `WatchRecordRequest`：必填且不晚于今天的 `watchedOn`、可空的 1–5 整数 `rating`、最多 1000 字符的 `notes`。未知请求字段返回 400，不保留旧契约兼容。

影片响应包含 `watchRecords`，以及派生的 `watchStatus`、`watchStatusLabel` 和最近一次观看的 `rating` / `watchedOn`。电影的 `notes` 始终是电影备注，观看笔记在各自的 `watchRecords[].notes` 中。观看增删改均返回更新后的完整影片，便于同步页面统计与历史列表。删除影片同时删除全部观看；删除最后一条观看后状态变回想看。

错误：缺失、无效、过期或已不存在的用户 Token 返回统一 JSON `401`；非法请求/评分/日期返回 `400`；不存在或不属于当前用户的观影记录返回 `404`。

## Lab

| 方法 | 路径 | 前端 | 后端 | 说明 |
|------|------|------|------|------|
| GET | `/api/v1/lab/tables` | `features/lab/api/labApi.ts` | `LabController` | 四张业务表，含 `watch_records` |
| GET | `/api/v1/lab/tables/{name}` | 同上 | 同上 | 列/主键/索引 |
| POST | `/api/v1/lab/query` | 同上 | 同上 | 受控 SQL，写日志 |

`SqlQueryResponse` 字段：`statementType`、`statementTypeLabel`、`columns`、`rows`、`rowCount`、`affectedRows`、`truncated`、`durationMs`、`auditRecorded`。影响 0 行与 SQL 错误分开表达；审计失败不撤销已执行语句，`auditRecorded=false` 不代表可以重新执行写操作。

## Learning Sandbox

- `POST /api/v1/learning/sandbox/query`：请求 `{ "sql": "..." }`，结果同 SQL 响应。
- `POST /api/v1/learning/sandbox/reset`：只重建当前用户的临时教学样本，返回 200，data 为 null。
- 必须登录；不接受数据库路径，不访问真实 users 或 movies。示例用户只有合成邮箱，无密码字段。

## Operation Logs

| 方法 | 路径 | 前端 | 后端 |
|------|------|------|------|
| GET | `/api/v1/operation-logs?page=&size=&success=` | `features/log/api/operationLogApi.ts` | `OperationLogController` |
| GET | `/api/v1/operation-logs/stats` | 同上 | 同上 |

分页响应：`content`、`page`、`size`、`totalElements`、`totalPages`、`first`、`last`。  
分页实现使用 Spring Data `Page`，**无第三方分页插件**。

电影日志 `detail` 为完整 JSON：根字段 `ownerId`、`before`、`after`。新增保存 after；更新保存 before / after；删除保存 before。快照包含响应 DTO 的全部字段，空值仍保留，详情不截断。SQL 日志记录语句，不等同于电影逐行变更审计。
