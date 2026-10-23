# 后端与数据库词汇表

| 概念 | 含义 | 在本项目 |
|------|------|----------|
| Controller | 接收 HTTP 请求并返回响应 | `*Controller` |
| DTO | 明确请求或响应中的数据字段 | `*Request` / `*Response` |
| Entity | 映射数据库持久化数据的对象 | `User` / `Movie` / `WatchRecord` / `OperationLog` |
| Repository | 提供持久化查询与写入 | `JpaRepository` |
| Service | 编排业务规则与事务 | `*Service` |
| Page | 当前页数据与匹配总数 | 日志分页响应 |
| SqlGuard | 限制可执行 SQL，不提供行级授权 | SQL 实验保护 |
| Profile | 选择不同的运行配置 | `sqlite` / `mysql` |
| JWT | 服务端签发并验证的身份令牌 | `Authorization: Bearer` |
| owner_id | 记录所属用户的 ID | 电影查询的数据归属条件 |
| Operation Log | 记录业务操作与修改前后快照 | `operation_logs` |
