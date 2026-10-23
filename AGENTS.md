# DB Lab 协作约定

## 项目概览

- 产品：DB Lab（在线数据库教学）
- 后端：`backend/`，Spring Boot 4 + Java 21 + Maven，根包 `com.example.dblab`
- 数据库：默认 **SQLite**（无 Docker）；可选 MySQL 8.4（Docker Compose + Flyway）
- 前端：Vite + React 19 + TypeScript + pnpm
- UI：**HeroUI v3 + Tailwind CSS 4**；SQL 编辑器用 `@monaco-editor/react`

## 本地技能

- `.agents/skills/java-springboot/SKILL.md`
- `.agents/skills/heroui-react/SKILL.md`

## 后端规范

- 按业务分包：`auth` / `movie` / `lab` / `oplog` / `security` / `common` / `config`
- 业务包内再分：`controller` / `service` / `repository` / `entity` / `dto`
- 构造器注入，依赖字段 `private final`
- getter/setter 手写，不使用 Lombok
- Controller 只处理 HTTP；业务在 Service
- 请求/响应使用 DTO（优先 `record`），不暴露 Entity
- Bean Validation + 全局异常处理
- Lab SQL 必须经 `SqlGuard` 白名单；分页用 Spring Data `Page`/`Pageable`，不引入第三方分页插件

修改后端后：

```bash
cd backend
./mvnw test
```

## 前端规范

- 包管理：pnpm
- 功能目录：`features/auth`、`features/movie`、`features/lab`、`features/log`
- 组件优先 `@heroui/react`，样式优先 Tailwind 工具类 + 主题 token（`src/index.css`）
- 路由：React Router（`/movies`、`/lab`、`/logs`）

修改前端后：

```bash
cd frontend
pnpm build
pnpm lint
```

## 启动

```bash
# 默认 SQLite（不要在自动化流程里擅自长期挂起 spring-boot:run，除非用户要求）
cd backend && ./mvnw spring-boot:run
cd frontend && pnpm dev

# 可选 MySQL
# 先安全设置 APP_DB_PASSWORD、MYSQL_ROOT_PASSWORD、APP_SECURITY_JWT_SECRET 环境变量
docker compose up -d mysql
cd backend && SPRING_PROFILES_ACTIVE=mysql ./mvnw spring-boot:run
```

前端代理：`/api -> http://localhost:8090`

## Pitfalls

- 观影记录列表按当前用户 `owner_id` 过滤；Lab `INSERT` 必须写入当前用户 id，否则观影记录页查不到
- UUID 以 `varchar(36)` 存储，便于 SQL 复制删除
- `UPDATE`/`DELETE` 的 `WHERE` 检测兼容换行；无 `WHERE` 会被拒绝
- 仅限本地教学，不要把 SQL 工作台暴露到公网
