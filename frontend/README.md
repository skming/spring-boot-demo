# DB Lab Frontend

React 19 + Vite + HeroUI v3 + Tailwind CSS 4 + Monaco。

## 启动

```bash
pnpm install
pnpm dev
```

开发服务器：http://localhost:9090  
API 代理：`/api` → `http://localhost:8090`

## 页面

- `/auth` 登录注册
- `/movies` 电影资料与多次观影（独立抽屉，卡片/列表切换）
- `/lab` SQL 工作台
- `/logs` 操作日志（分页）
- `/learn` 9 阶段后端与数据库课程，37 节必修和 1 节 MySQL 选修
- `/learn/:lessonId` 短课、源码入口、只读 Monaco、即时反馈练习、验证与资料；切课重置答案，章节随滚动高亮
- `/learn/:lessonId/sql` 独立临时 SQL 样本库，不影响真实片单或其他用户的样本

## 校验

```bash
pnpm test
pnpm build
pnpm lint
pnpm format:check
```

代码检查使用 Oxlint，格式化使用 Oxfmt，不再依赖 ESLint。

```bash
pnpm lint:fix      # 应用安全的自动修复，不使用危险修复
pnpm format        # 格式化 frontend/ 中支持的源码与配置
pnpm format:check  # 只检查，不写入文件
```

配置分别位于 `.oxlintrc.json` 和 `.oxfmtrc.json`。Oxlint 启用原生 React Hooks、依赖数组、React Compiler 相关代码规则和 Fast Refresh 检查；旧的 Compiler 配置/gating 检查没有迁移，当前构建也未启用 React Compiler 插件。

Oxfmt 统一两空格、单引号、无分号，跳过构建产物、依赖和锁文件。不排序导入，也不格式化字符串或 Markdown 中的嵌入代码，避免影响课程示例；不处理后端 Java 和 SQL。

主题 token 在 `src/index.css`。更多学习路径见仓库根目录 `learning-roadmap/`。

类型支持多选，日期使用 HeroUI DatePicker，确认操作使用统一 HeroUI AlertDialog，错误通过 toast 提示。测试使用 Node.js 内置 runner、临时 SQLite 和 SSR，不依赖浏览器。

SQL 编辑器支持选中执行、撤销/重做、换行、展开编辑区、表名与当前表字段补全。工具图标使用 HeroUI Tooltip；SQL、记录 ID、日志详情和用户 ID 共用 CopyButton，复制成功短暂切换为勾选状态。右上角使用头像触发的 HeroUI Dropdown，保留账户信息与退出登录。
