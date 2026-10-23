# 架构

```text
浏览器 :9090
  └─ Vite
       └─ /api 代理 ──► Spring Boot :8090
                          ├─ Security (JWT)
                          ├─ auth / movie / oplog
                          └─ lab (SqlGuard + lab 数据源)
                               └─ SQLite 或 MySQL
```

## 后端结构

```text
com.example.dblab
├── auth/          # 注册登录
├── movie/          # 观影记录 CRUD
├── learning/       # 每用户独立的临时 SQL 教学库
├── lab/           # 元数据 + 受控 SQL
├── oplog/         # 操作日志
├── security/      # JWT / Filter / SecurityConfig
├── common/exception/
└── config/
```

## 前端结构

```text
frontend/src
├── app/                 # 路由、布局、鉴权
├── features/auth
├── features/movie
├── features/lab         # SqlEditor(Monaco) + 模板
├── features/log         # 日志表格 + 分页
├── features/learn       # 显式阶段、前置导航、只读代码、练习、独立 SQL 实验
└── shared/api
```

## 写与读如何配合

| 路径 | 用途 |
|------|------|
| Movie API | 业务写路径，自动带当前用户 `owner_id` |
| Lab SQL | 教学 SQL 路径，可查可改；插入须指定当前用户 id |
| Operation Log | 复盘刚才做了什么（API 或 SQL） |

## 配置

| 文件 | 作用 |
|------|------|
| `application.yml` | 默认 `sqlite`、端口 8090 |
| `application-sqlite.yml` | SQLite 文件库；Flyway 关闭；`ddl-auto: none`；执行 schema 初始化 |
| `application-mysql.yml` | MySQL + Flyway |
| `db/schema-sqlite.sql` | SQLite 四张业务表、外键、索引与 CHECK 约束 |
| `db/migration/V1__init_schema.sql` | MySQL 新空库的四张业务表 |
| `db/lesson-samples.sql` | 独立临时教学库的合成样本，不含真实认证信息 |

实体、配置与安全对象的 getter/setter 均手写，不依赖 Lombok。Controller → Service → Repository 使用显式构造器注入，HTTP DTO 使用 Java record。MovieRequest 与 WatchRecordRequest 分别校验影片和观看资料，IsoDateConverter 转换日期，GenresConverter 转换类型数组与 JSON TEXT。

观影页用 HeroUI Drawer 承载新增/编辑表单，卡片与列表共用操作组件；确认流程由 `ConfirmProvider` 统一提供 HeroUI AlertDialog，错误用 toast。日期 Calendar 内只放带正确 slot 的导航按钮，清空按钮位于 Calendar 外，避免继承导航上下文。
