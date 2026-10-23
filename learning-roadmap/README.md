# 学习路线入口

目标是独立修改观影项目后端，并解释 Controller → Service → Repository → 数据库的完整过程。课程只教授 Java / Spring Boot、接口、SQL 和数据库测试，页面只是操作与核对工具。

## 从这里开始

1. 按 [START-HERE](START-HERE.md) 启动，分清实际业务库和独立 SQL 样本库。
2. 打开 `/learn`，从“启动项目与定位数据”开始，沿快速开发主线学习，第9课开始实际修改。
3. 每课先预测，再改变一个条件并验证；不会的概念通过前置课程回看。
4. 最后独立完成一个小型后端改动，提供接口与数据库测试证据。

**`/learn` 是唯一正式课程顺序。** 面向有TypeScript和接口联调经验的开发者，包含9个阶段、32节快速开发主线和10节深入理解专题。默认导航只走主线，专题不成为主线前置条件。源码见 [curriculum.ts](../frontend/src/features/learn/curriculum.ts)，设计与验收见 [COURSE-PLAN.md](COURSE-PLAN.md)。

## 学习阶段

1. 项目、数据与 Java 基础
2. HTTP 与接口契约、第一次修改
3. Spring 与 JPA 基础
4. SQL 查询基础
5. 电影 CRUD 与分页
6. 登录与数据归属
7. 多次观看与关联查询
8. 事务与一致性
9. 审计、完整开发示范与独立修改

默认SQLite主线无需Docker。集合细节、SQL写入与约束、聚合、转换器、事务代理及异常规则按需查专题。只有REQUIRES_NEW独立提交实验需要Docker/MySQL。

先修改备注校验，再阅读“新增发行年份”完整示范，最后独立增加“原文片名”。后两项是学习者在练习副本实现的需求，当前API没有这些字段；课程更新不自动修改业务表或历史数据。

## 按需查阅，不是另一套必学顺序

- 数据库：[启动](database/db-01-mysql-setup.md)、[Schema](database/db-02-schema-and-flyway.md)、[SQL 操作](database/db-03-sql-select-lab.md)、[SQL 文件](sql/)
- 后端：[骨架](backend/phase-01-foundation.md)、[认证](backend/phase-02-auth.md)、[电影](backend/phase-03-movie-crud.md)、[SQL API](backend/phase-04-lab-api.md)、[审计](backend/phase-05-operation-log.md)
- 页面操作参考（非课程）：[登录](frontend/phase-01-shell-and-auth.md)、[观影记录](frontend/phase-02-movie-ui.md)、[数据库操作](frontend/phase-03-lab-ui.md)、[操作日志](frontend/phase-04-operation-log-ui.md)
- [后端与数据库词汇](glossary.md)

## 数据与验证规则

- 实际电影按当前用户 owner_id 隔离；观看通过父电影归属授权。
- 课内 SQL 使用独立临时样本，`/lab` 操作实际教学业务库，不要混用。
- 写入前 SELECT 确认目标，写入后查询确认结果；影响 0 行与执行失败分别解释。
- 阅读、选择题和页面打开不会自动证明已掌握；Docker 测试跳过也不表示验证通过。
