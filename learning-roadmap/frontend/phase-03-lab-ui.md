# 数据库操作参考

本文仅说明页面操作，不属于教学课程。

1. 课程 SQL 在课内的独立样本库中练习；`/lab` 操作实际教学业务库，两者不互通。
2. 选择数据表查看字段，载入示例或自行输入 SQL。
3. 选中 SQL 后执行只运行选区；无选区时执行全文。快捷键为 `⌘/Ctrl+Enter`，每次最多 5000 字符。
4. 写入前核对目标与 WHERE 范围，先 SELECT 再修改。新增电影需要填写当前用户的 owner_id。
5. 最近执行记录只载入 SQL，不自动执行；结果筛选只作用于已返回数据，可复制筛选后的 JSON。
6. 用实际影响行数核对写入结果；返回 auditRecorded=false 时不要因此重复执行写操作。

SQL 练习见 [DB03](../database/db-03-sql-select-lab.md)，接口原理见 [B04 Lab API](../backend/phase-04-lab-api.md)。
