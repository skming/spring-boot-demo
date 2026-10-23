# B04 Lab API

## 先看

- `lab/controller/LabController.java`
- `lab/service/SqlGuard.java`
- `lab/service/LabQueryService.java`
- [docs/lab-security.md](../../docs/lab-security.md)

## 目标

1. 白名单允许哪些语句
2. `WHERE` 检测如何兼容换行
3. 执行结果如何返回 `affectedRows`
4. 为何成功/失败都记日志

## 验证

- `SELECT` 返回 rows
- `DELETE ... WHERE ...` 返回 `affectedRows`
- `DELETE FROM movies`（无 WHERE）→ 400
