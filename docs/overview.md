# 项目总览

DB Lab 是一个教学应用：用真实可运行的前后端，同时练 **Java 分层** 与 **SQL 操作**。

## 主要页面

| 页面 | 作用 |
|------|------|
| `/movies` | 通过业务 API 管理观影记录（创建/改/删/筛选） |
| `/lab` | 受控 SQL 工作台（Monaco 高亮、模板、增删改查） |
| `/logs` | 操作日志（表格展开详情、服务端分页） |
| `/learn` | 9 阶段后端与数据库课程，含前置导航和独立 SQL 样本；MySQL 实验为选修 |

`/lab` 支持按名称查找数据表、查看表结构及载入示例 SQL。最近执行记录仅在当前页面内存中保留 20 次，点击记录只载入 SQL，覆盖编辑器前需要确认，不会自动执行。查询结果可按单元格内容筛选，并复制当前可见结果的 JSON；筛选只作用于已返回的数据，不改变 SQL 或实际影响行数。复制操作完成后显示成功状态，执行错误仍通过 Toast 提示。

## 根包与命名

- Java 根包：`com.example.dblab`
- 业务对象：`Movie`、`WatchRecord`
- 表：`users`、`movies`、`watch_records`、`operation_logs`
- 默认库：SQLite 文件 `backend/data/cinema.sqlite`

## 学习模式

代码已落地。默认 **Study Mode**：

1. 读概念与文档
2. 打开指定源码
3. 用页面 / SQL / 日志验证

## 关键不变量

1. 观影记录列表只返回当前登录用户的数据（`owner_id`）
2. Lab SQL 受 `SqlGuard` 约束：允许 DML，但 `UPDATE`/`DELETE` 必须有 `WHERE`
3. 重要操作写入 `operation_logs`，可在日志页或 SQL 中查看

## 下一步

1. [architecture.md](architecture.md)
2. [data-model.md](data-model.md)
3. [api-map.md](api-map.md)
4. [lab-security.md](lab-security.md)
5. [../learning-roadmap/START-HERE.md](../learning-roadmap/START-HERE.md)
