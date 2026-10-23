# Lab 工作台安全说明

本项目的 SQL 工作台 **只用于本地教学**。

## 已做的限制

1. 必须登录
2. 允许：`SELECT` / `WITH` / `EXPLAIN` / `INSERT` / `UPDATE` / `DELETE`
3. `UPDATE` / `DELETE` **必须包含 `WHERE`**（兼容换行写法）
4. 禁止多语句
5. 禁止 DDL / 权限变更等关键字（`DROP`、`ALTER`、`TRUNCATE`…）
6. 限制返回行数与语句超时
7. 尝试记录成功与失败；审计故障通过 `auditRecorded=false` 单独表达，不误报已执行 SQL 为失败

## 代码入口

- `lab/service/SqlGuard.java`：白名单
- `lab/service/LabQueryService.java`：执行与记日志
- `lab/config/LabDataSourceConfig.java`：Lab 数据源
- `frontend/src/features/lab/sqlPresets.ts`：示例 SQL（绑定当前用户 id）

## 常见失败

| 现象 | 原因 |
|------|------|
| `blocked keyword: SET` | 旧版本误拦；已修复，需重启后端 |
| `must include a WHERE clause` | 多行 SQL 的 `WHERE` 前是换行；已兼容，需重启后端 |
| Lab 插入后观影记录页没有 | 检查 `owner_id` 是否为当前登录用户，再刷新片单；「我的片单」只查询，不修改归属 |

## 不要做的事

- 不要把服务暴露到公网
- 不要在示例里默认 `SELECT password_hash`
- 生产环境不要复用这套可写 SQL 工作台

`SqlGuard` 是基于关键字与模式匹配的教学限制，不是完整 SQL 解析器或权限边界。有 WHERE 不保证只影响一行，也不保证归属当前用户。工作台没有行级隔离；前端确认仅用于减少误操作，不能作为权限校验。

## 课程实验库

`/api/v1/learning/sandbox/*` 使用每用户独立的临时 SQLite，不连接业务数据源。只初始化合成用户邮箱、影片与观看，无密码或 Token。重置只影响当前用户；连接按次关闭，退出服务时删除本实例的临时目录。

同一服务最多创建 32 个样本库，每个库限制为 4096 页（默认页大小约 16 MiB），执行与重置串行处理。SQL 仍需通过 SqlGuard，保留返回行数和查询超时限制。这些保护不使本地 SQL 工具变成可公开部署的安全执行平台。
