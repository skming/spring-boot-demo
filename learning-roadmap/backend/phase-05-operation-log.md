# B05 操作日志

## 先看

- `oplog/entity/OperationLog.java`
- `oplog/service/OperationLogService.java`
- `oplog/controller/OperationLogController.java`

## 目标

- 了解记录点：Auth / Movie / Lab
- 日志使用默认事务传播：Auth / Movie 日志随业务事务一起提交或回滚；Lab 在 SQL 执行后单独记录成功或失败。没有使用 `REQUIRES_NEW`，避免 SQLite 外层事务未提交时另开写事务导致锁库。
- 分页：`PageRequest` + `OperationLogPageResponse`
- **不引入** PageHelper / MyBatis-Plus 等分页插件

## API

```http
GET /api/v1/operation-logs?page=0&size=10&success=true
GET /api/v1/operation-logs/stats
```

## 完成标准

能指出日志字段与一次 Lab SQL 的对应关系。
