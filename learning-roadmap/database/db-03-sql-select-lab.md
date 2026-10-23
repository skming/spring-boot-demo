# DB-03 工作台 SQL 实验

## 目标

在 `/lab` 完成查询与受控增删改，并理解与观影记录页的关系。

## 推荐练习顺序

1. **查询列表** / **我的观影记录**
2. **新增一条**（自动带当前用户 `owner_id`）
3. 回观影记录页确认能看见
4. **更新演示行** / **按 id 删除**
5. **查看操作日志**

配套文件：

- `frontend/src/features/lab/sqlPresets.ts`
- `learning-roadmap/sql/*.sql`（如有）

## 硬规则

- `UPDATE`/`DELETE` 必须有 `WHERE`
- 切换模板会保留草稿；「重置模板」才恢复原文
- 无 `WHERE` 的删除会被拒绝

## 完成标准

- 能解释为何 Lab 插入必须写对 `owner_id`
- 能在日志页或 `operation_logs` 表看到刚才的 SQL
