# B01 后端骨架

## 先看

- `DbLabApplication.java`
- `application.yml` / `application-sqlite.yml` / `application-mysql.yml`
- `AGENTS.md`

## 目标

说清：

- 默认 profile = `sqlite`
- 端口 `8090`
- 包按 `auth` / `movie` / `lab` / `oplog` 切分
- 对照 `AppProperties` 的手写 getter/setter，说明 YAML 如何绑定到嵌套配置；不依赖 Lombok

## 完成标准

能画出「请求 → Controller → Service → Repository/DB」路径。
