# DB Lab

以 **观影手账** 为主业务的数据库教学项目。记录自己真正想看、看过的电影，再用 SQL 观察数据如何存储、变化和统计。

## 观影玩法

- 片单：片名、导演、多选类型、电影备注与想看理由。
- 「今晚看什么？」：从自己的想看片单抽一部，不连续重复同一部（只有一部时除外），不自动修改数据。
- 多次观影：每次独立记录日期、1–5 星评分和笔记；可编辑或删除其中一次，不覆盖其他历史。删除最后一次观看后回到想看。
- 统计：影片数与观看次数分开，平均分按有评分的观看计算，不把未评分算作 0 分。
- SQL：定位同一条 `movies` 记录；类型支持多选，以 JSON 数组保存在 `movies.genres`，无需额外关联表。
- 添加 / 编辑：HeroUI 侧边抽屉；片单支持卡片 / 列表切换，日期、选择与确认弹框统一使用 HeroUI。
- 没有任务挑战或闯关，按自己的兴趣使用片单，通过真实数据学习。

你将同时学习：

1. **数据库**：表结构、约束，以及受控 SQL（`SELECT` / `INSERT` / `UPDATE` / `DELETE`）
2. **Java / Spring Boot 4**：分层 API、JWT 登录、JPA、操作日志
3. **React**：观影记录页写数据，工作台用 SQL 观察与练习，日志页复盘操作

## 最小闭环

1. 注册 / 登录
2. 在 **观影记录页** 创建观影记录，或在 **工作台** 用「新增一条」插入（`owner_id` 为当前用户）
3. 在工作台 `SELECT`，看见同一行
4. `UPDATE` / `DELETE` 必须带 `WHERE`；无 `WHERE` 会被拒绝
5. 打开 **日志** 页，查看刚才的操作记录（支持分页）

## 技术栈

| 层     | 技术                                                                       |
|--------|----------------------------------------------------------------------------|
| 后端   | Spring Boot 4、Java 21、Spring Data JPA、Security、Flyway（MySQL）      |
| 数据库 | **默认 SQLite**；可选 MySQL 8.4                                        |
| 前端   | React 19、TypeScript、Vite、HeroUI v3、Tailwind CSS 4、Monaco Editor、pnpm |

## 启动（默认：SQLite，无需 Docker）

```bash
# 1. 后端（默认 profile=sqlite）
(cd backend && ./mvnw spring-boot:run)

# 2. 前端
(cd frontend && pnpm install && pnpm dev)
```

- 前端：http://localhost:9090
- 后端：http://localhost:8090
- 代理：`/api` → `http://localhost:8090`
- SQLite 文件：`backend/data/cinema.sqlite`

### 可选：MySQL（需要 Docker）

先在当前终端安全设置 `APP_DB_PASSWORD`、`MYSQL_ROOT_PASSWORD` 与 `APP_SECURITY_JWT_SECRET`，不要提交凭据到仓库。Compose 会校验这些变量；数据库仅监听本机 3306，切换 profile 不会迁移原数据库。

```bash
docker compose up -d mysql
cd backend
SPRING_PROFILES_ACTIVE=mysql ./mvnw spring-boot:run
```

MySQL 连接配置见 `application-mysql.yml`；自定义环境使用 `APP_DB_*` 和 `APP_LAB_DB_*` 环境变量。

MySQL 使用单一 `V1__init_schema.sql` 初始化新的观影模型。仅适用于空库；不要在带旧 Flyway 历史或重要数据的外部数据库上直接运行。已有旧版本数据库时，请另建空的教学数据库并配置连接，本项目不保留历史表或迁移兼容代码。

### 数据初始化

默认库为 `backend/data/cinema.sqlite`，启动时执行 `db/schema-sqlite.sql` 初始化空库，建立 `users`、`movies`、`watch_records`、`operation_logs` 四张业务表。新模型不兼容旧 schema，不迁移历史数据；重建后需要重新注册并登录。初始化脚本不会在每次启动时删除数据。

## 页面导览

| 路由     | 作用                             |
|----------|----------------------------------|
| `/auth`  | 注册登录                         |
| `/movies` | 观影记录 CRUD（业务 API）            |
| `/lab`   | 受控 SQL 工作台（Monaco + 模板） |
| `/logs`  | 操作日志（表格展开 + 分页）      |
| `/learn` | 9阶段课程，32节快速开发主线与10节深入理解专题 |
| `/learn/:lessonId` | 代码、练习、验证依据与资料 |
| `/learn/:lessonId/sql` | 当前用户独立的临时 SQL 样本库 |

## 学习入口

- [learning-roadmap/START-HERE.md](learning-roadmap/START-HERE.md)
- [learning-roadmap/README.md](learning-roadmap/README.md)
- [docs/overview.md](docs/overview.md)
- [docs/data-model.md](docs/data-model.md)
- [docs/api-map.md](docs/api-map.md)
- [docs/lab-security.md](docs/lab-security.md)

## 验证

```bash
(cd backend && ./mvnw test)
(cd frontend && pnpm test && pnpm build && pnpm lint)
```

后端测试使用独立临时 SQLite，覆盖观影历史 CRUD、归属与父子关系、级联删除、评分/日期校验、真实 flush 后回滚、审计故障、受检异常、rollback-only、代理调用和教学库隔离。MySQL 测试包含真实 REQUIRES_NEW 独立提交实验，在 Docker 不可用时跳过；跳过不代表已验证。

前端 `pnpm test` 使用 Node.js 内置 runner 检查片单、按观看计分、编辑保护、确认框、复制与 SQL 结果反馈。课程检查会验证前置关系、必修/选修导航、真实源码节选，并在临时教学样本上执行全部 SQL 示例及错误边界。SSR 检查组件结构与 Calendar 组合，不代替浏览器交互验收。需要支持原生 TypeScript 与 `node:sqlite` 的 Node.js（建议 Node 24 或以上）。

页面沿用 HeroUI v3 和主题 token，错误通过 toast 提示。工作台模板切换保留草稿，执行中禁止编辑和重复提交；非普通 SELECT 需要确认，修改 SQL 后保留上次结果并标记。小屏可展开表结构。关闭观影抽屉时确认未保存内容，浏览器刷新/关闭使用浏览器自身的离开提示。类型统计模板按 JSON 类型组合分组。

电影和观看操作日志保存完整 `before` / `after` 快照，包含观看历史。业务审计与电影、注册、登录共享事务，失败一起回滚。SQL 使用独立连接执行，事后审计不能撤销已提交 SQL；响应通过 `auditRecorded` 单独表达日志结果，页面不会因此提示 SQL 未执行。详见 [事务约定](docs/transactions.md)。

工作台「新增一条」使用浏览器生成的标准 UUID，模板 SQL 不依赖 SQLite 专用随机函数。再次新增时点击「重置模板」生成新 id；重复执行同一 INSERT 会触发主键约束。当前用户信息缺失或 id 无效时，不提供依赖归属的模板。

## 安全提示

工作台 **仅限本地教学**：

- 必须登录
- 允许 `SELECT` / `INSERT` / `UPDATE` / `DELETE` / `EXPLAIN`
- `UPDATE` / `DELETE` 必须带 `WHERE`；禁止 DDL 与多语句
- 不要暴露到公网

课程 SQL 实验与工作台不同：实验库按用户隔离，只有合成样本、不含密码或真实片单；可单独重置，服务退出后清理。工作台仍直接访问本地业务库，不提供行级权限隔离。
