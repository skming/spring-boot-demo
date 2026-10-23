# 操作日志参考

本文仅说明页面操作，不属于教学课程。

1. 在 `/logs` 按全部、成功或失败筛选日志，翻页查看其他记录。
2. 展开电影操作日志，比较 before 与 after；删除操作保留删除前快照。
3. 查看 SQL 日志时，区分语句执行失败与合法语句影响 0 行。
4. 核对接口 data.totalElements 与 data.content 的数量，分别理解匹配总数和当前页条数。

审计与分页原理见 [B05 操作日志](../backend/phase-05-operation-log.md)。
