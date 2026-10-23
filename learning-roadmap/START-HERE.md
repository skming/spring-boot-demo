# START HERE

目标：启动项目，认识实际片单、数据库与日志的位置。正式学习顺序统一从 `/learn` 第一课开始，本页仅作为启动与操作参考。

## 1. 启动后端（默认 SQLite）

```bash
cd backend
./mvnw spring-boot:run
```

库文件：`backend/data/cinema.sqlite`  
健康检查：`curl http://localhost:8090/actuator/health`

可选 MySQL：

先在当前终端安全设置 `APP_DB_PASSWORD`、`MYSQL_ROOT_PASSWORD` 和 `APP_SECURITY_JWT_SECRET`。MySQL 8.4 使用独立空教学库，不迁移历史数据库；无需 Docker 时继续默认 SQLite 即可。

```bash
docker compose up -d mysql
SPRING_PROFILES_ACTIVE=mysql ./mvnw spring-boot:run
```

## 2. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

打开 http://localhost:9090

## 3. 注册登录并创建观影记录

1. `/auth` 注册并登录
2. `/movies` 点 **添加电影**，在侧边表单填写标题 `hello-lab`，选择至少一个类型并保存
3. 使用卡片底部的复制图标复制电影 id，或点 **SQL** 定位这条记录；展开 **观影历史** 查看历次观看
4. 点 **记录观影** 添加一次观看；再次进入可记录重看、编辑或删除某次观看

## 4. 工作台验证

进入 `/lab`：

```sql
SELECT m.id, m.title, m.genres, w.rating, w.watched_on, m.owner_id
FROM movies m LEFT JOIN watch_records w ON w.movie_id = m.id
ORDER BY m.updated_at DESC, w.watched_on DESC
LIMIT 20;
```

应看到 `hello-lab`。

初次体验只查询，不直接删除实际片单。复制这条电影的 id 与 owner_id，替换下面占位值确认目标：

```sql
SELECT id, title FROM movies
WHERE id = '<movie-id>' AND owner_id = '<current-user-id>';
```

也可用模板：

- **新增一条**：自动带当前用户 `owner_id`
- 再次新增前点 **重置模板**：生成新 UUID，避免重复执行同一 INSERT 触发主键冲突
- **我的片单**：只查询当前用户的电影，不修改数据
- 切换模板会保留你编辑过的草稿

## 5. 看操作日志

打开 `/logs`：

- 表格查看最近操作
- 展开行看完整 SQL/详情
- 底部分页；可用成功/失败筛选

## 完成后

进入 `/learn`，从“启动项目与定位数据”开始，沿32节快速开发主线继续。先补Java差异和调试，第9课修改备注校验，再学习Spring/JPA、SQL、CRUD、权限与事务，最后完成完整后端变更。不教授界面实现；10节深入理解专题按需查阅，不阻塞主线。

课内 SQL 实验使用独立临时库，写入练习优先在课内进行，不会修改上面真实片单；不要把两处数据混为同一个库。MySQL 独立事务实验是选修，无 Docker 不影响默认 SQLite 主线。更多查阅入口见 [README.md](README.md)。

## 常见卡点

| 现象 | 处理 |
|------|------|
| Lab 插入后观影记录页没有 | 检查 owner_id 是否为当前登录用户，然后刷新片单；「我的片单」是只读查询 |
| `must include a WHERE` | 确认有 WHERE；多行写法已支持，旧进程需重启后端 |
| Base64 形式的 id 删不掉 | 使用标准 UUID 字符串 |
