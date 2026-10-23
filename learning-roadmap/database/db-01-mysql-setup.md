# DB-01 数据库启动（SQLite 默认 / MySQL 可选）

## 目标

能启动教学库，并说清两种引擎的使用场景。

## 默认：SQLite（推荐入门）

```bash
cd backend
./mvnw spring-boot:run
```

- 文件：`backend/data/cinema.sqlite`
- 无需 Docker
- Schema 由 `db/schema-sqlite.sql` 初始化，JPA `ddl-auto: none`

可用系统 `sqlite3` 查看：

```bash
sqlite3 backend/data/cinema.sqlite ".tables"
```

## 可选：MySQL

使用 MySQL 8.4，仅连接新建的空教学库。先在同一终端安全设置 `APP_DB_PASSWORD`、`MYSQL_ROOT_PASSWORD` 和 `APP_SECURITY_JWT_SECRET`（不要把真实凭据写入文件或命令历史）。Compose 会校验这些变量，后端仅连接应用账号。

```bash
docker compose up -d mysql
cd backend
SPRING_PROFILES_ACTIVE=mysql ./mvnw spring-boot:run
```

```bash
docker compose exec mysql mysql -u dblab -p dblab -e 'SHOW TABLES;'
```

## 完成标准

当前 MySQL 的 V1 面向空库；旧版本数据库需另建空教学库并配置连接，不复用旧 Flyway 历史。

- 知道默认为什么是 SQLite
- 知道 MySQL profile、3306 端口和 `APP_DB_*` 环境变量；同一组参数也用于 SQL 操作连接
- 不把 H2 当作教材路径

## 相关文件

- `backend/src/main/resources/application.yml`
- `application-sqlite.yml`
- `application-mysql.yml`
- `docker-compose.yml`
