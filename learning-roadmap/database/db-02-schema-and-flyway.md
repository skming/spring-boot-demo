# DB-02 Schema 与迁移

## 目标

说清四张业务表，以及 SQLite / MySQL 各自如何建表。

## 先看

- [docs/data-model.md](../../docs/data-model.md)
- `movie/entity/Movie.java`、`auth/entity/User.java`、`oplog/entity/OperationLog.java`
- SQLite：`db/schema-sqlite.sql`
- MySQL：`db/migration/V1__init_schema.sql`（新空库）

## 要点

1. UUID 以字符串存储，方便 Lab 复制 `WHERE id = '...'`
2. `movies.owner_id` 决定观影记录页能否看见
3. MySQL 用 Flyway；SQLite 用显式 SQL 初始化
4. 多选类型以 JSON 数组保存在 movies.genres；没有额外类型关联表
5. movies 与 watch_records 为一对多，每次观看独立保存日期、评分和笔记

## 验证

后端启动后：

```sql
SELECT name FROM sqlite_master WHERE type='table';  -- SQLite
-- MySQL 使用单独语句：SHOW TABLES;
```

应看到 `users`、`movies`、`watch_records`、`operation_logs`。
