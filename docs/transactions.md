# 事务与审计约定

| 用例 | 事务边界 | 审计失败 |
|------|----------|----------|
| 电影与观看增删改 | MovieService 的 REQUIRED 事务 | 业务与审计一起回滚 |
| 注册 | AuthService 的 REQUIRED 事务 | 不保留用户，不返回成功响应 |
| 登录 | AuthService 的 REQUIRED 事务 | 不返回登录成功或 Token |
| 工作台 / 教学 SQL | JDBC 独立连接执行，审计另行提交 | 保留实际 SQL 结果，返回 auditRecorded=false |

OperationLogService 不捕获并忽略持久化异常。共享事务已标记 rollback-only 时，即使外层 catch，仍不能成功提交。SQL 调用方在审计事务代理之外处理日志故障，因此也能区分日志提交阶段的错误。

`save` 不等于提交；`flush` 同步 SQL 后仍然可以回滚。真实故障注入仅在测试中，不向业务 API 添加模拟失败参数。

## 可运行检查

在 backend 目录执行：

```sh
./mvnw -o -Dtest=TransactionConsistencyIntegrationTest test
./mvnw -o -Dtest=SqliteApiFlowIntegrationTest test
./mvnw -o -Dtest=MySqlTransactionPropagationIntegrationTest test
```

SQLite 测试验证影片与观看审计故障、flush 后业务失败、受检异常默认行为、rollbackFor、rollback-only 与同类调用。SQL 测试在审计故障后核对实际更新仍保留，避免把已提交的写入误报成执行失败。

MySQL 测试中外层先写入并 flush，内层 REQUIRES_NEW 独立提交，随后外层回滚；只有内层影片与审计保留。需要 Docker，缺少环境时会跳过，不能据此宣称独立事务行为已经验证。SQLite 不用于证明这个双写场景。

规则依据：[Spring 事务传播](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)、[回滚规则](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)。
