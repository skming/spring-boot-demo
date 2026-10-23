import type { LessonQuestion } from './types'

export const COURSE_UNITS = [
  {
    id: 'foundation',
    title: '项目、数据与 Java 基础',
    outcome: '区分用户、电影与观看，读懂对象、方法和集合。',
  },
  {
    id: 'http',
    title: 'HTTP 与接口契约',
    outcome: '读懂请求、DTO、校验错误与统一响应，并核对接口断言。',
  },
  { id: 'spring', title: 'Spring 与 JPA 基础', outcome: '沿构造器依赖找到业务与持久化入口。' },
  { id: 'sql', title: 'SQL 查询基础', outcome: '查询指定用户的数据；写入语句与约束按需深入。' },
  { id: 'crud', title: '电影 CRUD 与分页', outcome: '追踪完整用例，区分列表、分页与持久化修改。' },
  { id: 'identity', title: '登录与数据归属', outcome: '区分身份与权限，验证两个用户的数据隔离。' },
  {
    id: 'relations',
    title: '多次观看与关联查询',
    outcome: '理解一对多、关联查询、聚合与子记录生命周期。',
  },
  {
    id: 'transactions',
    title: '事务与一致性',
    outcome: '解释提交、回滚、代理与 REQUIRED，并用真实数据库验证。',
  },
  {
    id: 'delivery',
    title: '审计与独立开发',
    outcome: '完成一个贯穿 DTO、业务、持久化和测试的后端需求。',
  },
] as const

type UnitId = (typeof COURSE_UNITS)[number]['id']
export type Lesson = {
  id: string
  number: number
  unit: UnitId
  optional: boolean
  prerequisites: string[]
  title: string
  question: string
  paragraphs: string[]
  prediction: string
  exercise: string
  code: string
  language: 'java' | 'sql' | 'json' | 'http' | 'shell'
  source: { path: string; symbol: string; exact: boolean }
  verification: string
  pitfall: string
  quiz: LessonQuestion
  reference: { title: string; url: string }
}
type Entry = Omit<Lesson, 'number' | 'quiz' | 'optional'> & {
  choices: [LessonQuestion['options'][number], LessonQuestion['options'][number]]
  answer: string
  explanation: string
}
const javaRoot = 'backend/src/main/java/com/example/dblab/'
const movie = 'movie/entity/Movie.java'
const service = 'movie/service/MovieService.java'
const controller = 'movie/controller/MovieController.java'
const repository = 'movie/repository/MovieRepository.java'
const transactionTest =
  'backend/src/test/java/com/example/dblab/TransactionConsistencyIntegrationTest.java'
const schema = 'backend/src/main/resources/db/schema-sqlite.sql'
const samples = 'backend/src/main/resources/db/lesson-samples.sql'
const source = (file: string, symbol: string, exact = false) => ({
  path: file.startsWith('backend/') ? file : javaRoot + file,
  symbol,
  exact,
})
const java = { title: 'Java 类与对象', url: 'https://dev.java/learn/classes-objects/' }
const collections = {
  title: 'Java 集合框架',
  url: 'https://dev.java/learn/api/collections-framework/',
}
const sqlite = { title: 'SQLite SQL 文档', url: 'https://www.sqlite.org/lang.html' }
const mvc = {
  title: 'Spring MVC Controller',
  url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html',
}
const validation = {
  title: 'Spring MVC 校验',
  url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html',
}
const beans = {
  title: 'Spring 依赖注入',
  url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html',
}
const jpa = {
  title: 'Spring Data JPA',
  url: 'https://docs.spring.io/spring-data/jpa/reference/jpa.html',
}
const tx = {
  title: 'Spring 声明式事务',
  url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html',
}
const security = {
  title: 'Spring Security 架构',
  url: 'https://docs.spring.io/spring-security/reference/servlet/architecture.html',
}
const testing = {
  title: 'Spring 集成测试',
  url: 'https://docs.spring.io/spring-framework/reference/testing/integration.html',
}

const entries: Entry[] = [
  {
    id: 'development-workflow',
    unit: 'foundation',
    prerequisites: ['project-start'],
    title: '调试请求与定位错误',
    question: 'Maven 的 exit code 1 能直接说明接口哪里出错吗？',
    paragraphs: [
      'mvnw 是项目 Maven 入口，不带目标不能启动应用。spring-boot:run 启动，test 跑测试，-Dtest 指定测试类；依赖在 pom.xml，不是 Java import 自动下载。先验证 Java 21，再定位编译失败、启动失败或请求失败，不将它们混为同一问题。',
      'IDE 用 Java 21 启动 DbLabApplication，在 MovieController.create 和 MovieService.create 打断点；发送自己的合法请求，用 Step Into/Over 查看 request、ownerId 和调用栈。不要公开 Token 或密码，不在观察表达式里调用 save/delete 等有副作用的方法。',
      '启动错误往上找 APPLICATION FAILED TO START 的 Description 和异常 Caused by 链，定位第一个项目相关栈帧，不只看末尾 Maven 错误。application.yml 定义端口8090，application-sqlite.yml 定义默认数据库；profile 和环境变量影响实际配置，不把配置值写进业务代码。',
    ],
    code: 'java -version\n./mvnw -DskipTests compile\n./mvnw -Dtest=SqliteApiFlowIntegrationTest test',
    language: 'shell',
    source: source('DbLabApplication.java', 'SpringApplication.run(DbLabApplication.class, args);'),
    prediction: '请求已进入 Controller 但未进入 Service，应先检查数据库还是参数绑定和校验？',
    exercise:
      '在 backend 运行指定测试；使用 IDE 调试合法和缺少 title 的创建请求，记录 HTTP 状态及断点是否命中。对照两个 application 配置文件确认端口和当前数据库，不切换真实数据库。',
    verification:
      '合法请求进入 Controller 和 Service；缺少 title 被校验拒绝，不进入 create 方法体。能区分编译错误、配置绑定错误和业务异常，并指出一个项目栈帧。',
    pitfall:
      '测试通过不代表正在运行的旧进程已加载新代码；确认进程和端口，但不要停止不属于本项目的服务。',
    choices: [
      { value: 'development-workflow-a', label: '先检查绑定和校验，再沿调用栈定位' },
      { value: 'development-workflow-b', label: 'exit code 1 已经证明数据库坏了' },
    ],
    answer: 'development-workflow-a',
    explanation: '构建退出码是结果，具体异常、请求状态和执行位置才是定位证据。',
    reference: testing,
  },
  {
    id: 'java-bridge',
    unit: 'foundation',
    prerequisites: ['java-objects'],
    title: '从 TypeScript 到 Java 的关键差异',
    question: 'Integer 可以为 null，拆成 int 后还安全吗？',
    paragraphs: [
      'Java 的 int 不能为 null，Integer 可以；自动拆箱 null 会抛 NullPointerException。String 和 UUID 比较内容通常用 equals，== 比较对象引用，不照搬 TypeScript 的字符串比较习惯。需要兼容 null 时用 Objects.equals。',
      'record 声明固定组件并生成 title() 等访问器，不是普通类的 getTitle()；集合组件仍需考虑可变性。接口声明契约，List<WatchRecord> 的具体实现可以是 ArrayList；List.remove(record) 移除对象，不自带数据库删除。详见集合专题。',
      'Optional 表达可能查不到，orElseThrow 将空结果转成业务异常；不要无检查 get()。普通 Java 方法按调用栈同步执行，不因返回 DTO 就成为 Promise。受检异常需要处理或声明；RuntimeException 不强制声明，但仍可能使请求失败。package 决定类归属，跨包使用类型通常需要 import，同包可直接引用；import 不等于创建对象或注册 Bean。',
    ],
    code: `Integer rating = null;
boolean rated = rating != null;
boolean sameTitle = java.util.Objects.equals("星际穿越", title);
// int value = rating; // null 自动拆箱会抛异常。`,
    language: 'java',
    source: source('movie/entity/WatchRecord.java', 'private Integer rating;'),
    prediction: '未评分的 rating 为 null，能否直接用于 rating >= 1？',
    exercise:
      '定位 WatchRecord.rating、MovieRequest record 与 requireOwnedMovie 的 Optional，分别说明可空性、访问方法和查不到时的行为。在 IDE scratch 或 JShell 比较两个 new String 的 == 与 equals。',
    verification:
      '知道先判空再比较评分；能区分 request.title() 与 movie.getTitle()；能解释普通同步调用、集合操作和数据库提交不是同一件事。',
    pitfall: 'Integer 的 == 还可能受装箱缓存影响，不用几个小整数测试推断对象值比较规则。',
    choices: [
      { value: 'java-bridge-a', label: '可以，null 会自动变成 0' },
      { value: 'java-bridge-b', label: '不可以，拆箱前必须处理 null' },
    ],
    answer: 'java-bridge-b',
    explanation: '可空包装类型与不可空基本类型有明确边界。',
    reference: java,
  },
  {
    id: 'first-change',
    unit: 'http',
    prerequisites: ['request-validation'],
    title: '第一次修改：备注长度校验',
    question: '将备注上限改成 800，要先修改数据库表吗？',
    paragraphs: [
      '本课实际修改练习分支或自己的代码副本：只将 MovieRequest.notes 的 @Size(max = 1000) 改为 800。这是收紧 API 输入，不代表实体列和历史数据也必须缩短；本次不改 Movie 的列长度、不删库。下方是待修改片段，不是当前已经实施的规则。',
      '先在 SqliteApiFlowIntegrationTest 参照现有认证请求 helper 增加 800/801/null 的断言，再改注解。正常新增为201，801字符为400且 code 非0；失败请求不能新增电影或日志。发送 null 用可容纳 null 的 Map，不能用 Map.of 放 null。',
      '已有记录仍允许读取；校验整个 PUT 请求时，历史超长 notes 会被拒绝，需要用户主动修改。这是接口收紧的行为变化，不应悄悄截断数据。理解分层后再扩展业务规则，本课不要求先掌握全部框架。',
    ],
    code: '@Size(max = 800) String notes',
    language: 'java',
    source: source('movie/dto/MovieRequest.java', '@Size(max = 1000) String notes'),
    prediction: '801 字符被拒绝后，数据库电影数和审计数应增加吗？',
    exercise:
      '先写边界测试并确认800通过、801在改动前未被拒绝；再改 DTO 使新测试通过。重跑原有API测试，核对失败前后行数。练习完成后保留自己的差异或恢复自己的单行改动，不覆盖他人修改。',
    verification:
      '有注解与测试的实际代码差异；800和null成功，801返回400、data.fieldErrors包含notes，原数据不变。只运行 ./mvnw -Dtest=SqliteApiFlowIntegrationTest test，不操作业务库。',
    pitfall: '页面输入长度限制不能替代服务端校验；本课程展示示例，不会替你改写业务源码。',
    choices: [
      { value: 'first-change-a', label: '不必，本次只收紧 API 输入并验证边界' },
      { value: 'first-change-b', label: '必须删除数据库后才能改注解' },
    ],
    answer: 'first-change-a',
    explanation: '接口约束和持久化容量分属不同层，先明确当前需求的实际影响。',
    reference: validation,
  },
  {
    id: 'feature-walkthrough',
    unit: 'delivery',
    prerequisites: ['operation-audit', 'pagination'],
    title: '开发示范：新增发行年份',
    question: '新增 releaseYear，仅在响应 DTO 加字段就能保存吗？',
    paragraphs: [
      '以当前已实现的发行年份 releaseYear 为例，追踪完整的字段开发链路。发行年份必填，为 1888–2100 之间的整数；导演也必填。新增、修改、单条和列表响应一致，不改变观看日期。',
      '1. MovieRequest 使用 @NotNull @Min(1888) @Max(2100) Integer releaseYear；MovieResponse 包含同名组件。响应字段来自明确映射，不直接序列化 Entity。未登录仍401，他人影片仍404，不接受请求提供 ownerId。',
      '2. Movie 增加 @Column(name = "release_year") Integer releaseYear，手写 getter，并更新构造器和 update 参数。MovieService.create/update 传入 request.releaseYear()，toResponse 传入 movie.getReleaseYear()；同步检查所有构造调用及测试 helper，避免参数漏传或错位。',
      '3. 数据库也需要列：在一次性测试库中修改建表定义并验证。SQLite 当前用 IF NOT EXISTS 初始化，改 schema 文件不会给已有表自动加列；MySQL 已应用的 Flyway V1 也不能直接改作升级方案。已有库需独立迁移和恢复方案，本课不执行迁移或删除数据。',
      '4. 如需按年份查询，为 GET /movies 增加可选 releaseYear 参数，并将筛选一直传到 Repository。保留原来无参数返回当前用户完整 List 的行为；使用带 ownerId 的派生查询及 @EntityGraph，不拼接 SQL。别把内存筛选称为数据库分页。',
      '5. 审计使用 MovieResponse 生成 before/after，补字段后检查快照确实包含旧/新年份；更新失败或审计失败时，年份也必须回滚。不另开事务让必要审计脱离电影保存。',
      '6. API测试覆盖1888/2100成功，缺失、null、1887/2101及小数拒绝，创建后GET、更新后GET、列表返回、跨用户拒绝和失败后数据不变；事务测试验证审计失败时年份不变。年份筛选是可选扩展，不属于当前接口能力。',
    ],
    code: `// 请求 DTO 的发行年份组件。
@NotNull @Min(1888) @Max(2100) Integer releaseYear
// 实体新增字段，并补 getter、构造器和 update 赋值。
@Column(name = "release_year", nullable = false)
private Integer releaseYear;`,
    language: 'java',
    source: source(service, 'private MovieResponse toResponse(Movie movie)'),
    prediction: '响应里有年份，但重新 GET 变 null，应该检查哪条数据链路？',
    exercise:
      '按 DTO → Entity/表结构 → create/update → toResponse → 查询 → 审计 → 测试列出改动清单；仅在独立练习副本与一次性测试库实现。先编译，再跑 API 和事务测试，不改正在使用的数据库。',
    verification:
      '创建、更新、查询、快照中的年份一致；边界、缺失、null拒绝、归属和回滚通过实际断言。具备MySQL时另跑其真实集成测试，缺少环境明确记为未验证。',
    pitfall:
      '这里的年份范围是示范需求，不是框架默认值；源码入口展示现有映射，示例不是可直接粘贴的完整文件。',
    choices: [
      { value: 'feature-walkthrough-a', label: '不能，还要贯通输入、持久化、映射与测试' },
      { value: 'feature-walkthrough-b', label: '能，响应 record 会自动给数据库加列' },
    ],
    answer: 'feature-walkthrough-a',
    explanation: 'DTO 定义接口数据，数据库列与业务保存需要独立实现。',
    reference: jpa,
  },
  {
    id: 'project-start',
    unit: 'foundation',
    prerequisites: [],
    title: '启动项目与定位数据',
    question: '启动服务后，教学样本和实际片单在同一个数据库吗？',
    paragraphs: [
      '默认使用 SQLite，无需 Docker。先按 START-HERE 启动，再检查健康接口；启动失败时读失败说明与 Caused by 链，而不是只看 Maven 最后的退出码。',
      '实际片单保存在本地教学业务库；课内 SQL 使用每用户独立临时样本库。重置样本不会清理实际电影。先认识工具和数据位置，不要求理解认证内部实现。',
    ],
    code: 'cd backend\n./mvnw spring-boot:run',
    language: 'shell',
    source: source('DbLabApplication.java', 'SpringApplication.run(DbLabApplication.class, args);'),
    prediction: '在课内新增一条观看后，实际片单是否也会增加？',
    exercise: '检查健康接口；打开实际片单和课内 SQL 样本，分别记录当前电影数量，不执行删除。',
    verification:
      'GET /actuator/health 返回正常状态；重置课内样本后有 2 个示例用户、3 部电影、3 次观看。实际片单保持不变。',
    pitfall: '不要把业务库当作可随意重置的样本库。MySQL 是可选环境，不是入门必需条件。',
    choices: [
      { value: 'project-start-a', label: '不是，两者的数据与生命周期独立' },
      { value: 'project-start-b', label: '是，重置样本会清空实际片单' },
    ],
    answer: 'project-start-a',
    explanation: '样本隔离用于反复练习；工具能打开不代表可以混用数据。',
    reference: testing,
  },
  {
    id: 'data-model',
    unit: 'foundation',
    prerequisites: ['project-start'],
    title: '用户、电影与一次观看',
    question: '同一电影看两次，应增加电影行还是观看行？',
    paragraphs: [
      'users 保存用户身份，movies 保存片名、类型和电影备注，watch_records 保存每次观看的日期、评分与笔记；operation_logs 保存操作审计。先区分数据事实，再阅读映射注解。',
      'users.id 标识用户；movies.owner_id 引用所属用户；watch_records.movie_id 引用电影。它们可能存储相同的 UUID 值，但字段表达的角色不同。',
    ],
    code: `SELECT id, title, owner_id
FROM movies
ORDER BY title`,
    language: 'sql',
    source: source(samples, 'CREATE TABLE watch_records'),
    prediction: '已有星际穿越电影，再添加一次观看，电影总数是否改变？',
    exercise:
      '运行本课查询，指出每部电影的主键和所属用户；对照样本说明星际穿越的两条观看共享哪个电影 ID。',
    verification:
      '初始样本有 3 部电影；星际穿越的两次观看都引用同一个电影 ID。能分别解释电影 id、owner_id 与观看记录 id。',
    pitfall: 'owner_id 不是电影自己的 ID；观看评分不是电影资料中需要重复维护的一列。',
    choices: [
      { value: 'data-model-a', label: '增加一条 movies，复制电影资料' },
      { value: 'data-model-b', label: '只增加一条 watch_records，引用原电影' },
    ],
    answer: 'data-model-b',
    explanation:
      '应新增一条 watch_records 并引用原电影，movies 不增加行。因此电影总数不变，观看次数增加 1。',
    reference: sqlite,
  },
  {
    id: 'java-objects',
    unit: 'foundation',
    prerequisites: ['data-model'],
    title: '对象、字段与普通方法',
    question: 'movie.update 返回后，对象的新属性能立即读取吗？',
    paragraphs: [
      'Movie 是类，movie 是某个对象的引用。字段保存对象状态，构造器创建初始状态，getter 读取字段，普通方法可以修改字段。方法名 update 不是数据库专属语法。',
      'movie.update 是同步普通方法，返回后可读取修改后的字段；它没有直接执行数据库提交。先分清内存对象与数据库，事务阶段再解释持久化时机。',
    ],
    code: `public void touch(Instant instant) { updatedAt = instant; }`,
    language: 'java',
    source: source(movie, 'public void touch(Instant instant)', true),
    prediction: '调用 touch 后，getUpdatedAt 会等到数据库提交才返回新值吗？',
    exercise:
      '对照 Movie.update、touch 和 getter，逐个指出入参赋给了哪个字段；区分返回值与对象状态变化。',
    verification:
      '能解释赋值在方法调用内完成、getter 读取当前对象状态，但仅修改普通对象不能证明数据库已保存。',
    pitfall: '不要因方法叫 save 或 update，就把方法调用完成等同于事务提交。',
    choices: [
      { value: 'java-objects-a', label: '不能，必须等待其他线程' },
      { value: 'java-objects-b', label: '能，普通方法先修改内存中的字段' },
    ],
    answer: 'java-objects-b',
    explanation: '同步方法与数据库事务是两个层次；当前方法没有异步声明。',
    reference: java,
  },
  {
    id: 'java-collections',
    unit: 'foundation',
    prerequisites: ['java-objects'],
    title: 'List、接口与 remove',
    question: 'watchRecords 为什么能调用 remove？',
    paragraphs: [
      'List<WatchRecord> 表示保存 WatchRecord 的列表接口，new ArrayList<>() 提供具体实现。Movie 持有列表，不是继承了列表；列表方法来自集合契约。',
      'remove(record) 按对象相等规则移除匹配元素，remove(index) 按下标删除。getWatchRecords 返回不可修改副本，业务通过实体方法维护内部集合。数据库删除由后续关联映射决定。',
    ],
    code: `public void removeWatchRecord(WatchRecord record) { watchRecords.remove(record); }`,
    language: 'java',
    source: source(movie, 'public void removeWatchRecord(WatchRecord record)', true),
    prediction: 'record 是 WatchRecord 时，remove 接收的是列表位置还是对象？',
    exercise:
      '定位 watchRecords 的声明、addWatchRecord 和 getter，解释 List 与 ArrayList 的职责以及为什么不能修改 getter 返回值。',
    verification:
      '能区分持有对象、实现接口与继承类；指出这里调用 remove(Object)，并说明它本身不是 DELETE SQL。',
    pitfall: '集合移除不自动等于数据库删除；JPA 的受管关联和 orphanRemoval 是额外机制。',
    choices: [
      { value: 'java-collections-a', label: '类型是 List，可调用其集合方法' },
      { value: 'java-collections-b', label: 'Movie 继承 ArrayList，所以能调用' },
    ],
    answer: 'java-collections-a',
    explanation: '变量的声明类型决定可调用的方法，实际对象提供实现。',
    reference: collections,
  },
  {
    id: 'sql-select',
    unit: 'sql',
    prerequisites: ['data-model'],
    title: 'SELECT、字符串与 NULL',
    question: '怎样找到未评分的观看？',
    paragraphs: [
      'SELECT 指定列，FROM 指定表。SQL 字符串使用单引号；NULL 表示缺少值，不是 0 或空字符串。',
      'IS NULL 判断缺失值。rating = NULL 不会匹配未评分记录。先验证简单查询，再逐步增加条件，避免一次写入过多概念。',
    ],
    code: `SELECT watched_on, rating
FROM watch_records
WHERE rating IS NULL`,
    language: 'sql',
    source: source(schema, 'rating INTEGER CHECK'),
    prediction: '初始样本中只有霸王别姬未评分，查询会返回几行？',
    exercise: '先执行原查询，再把 IS NULL 改成 = NULL，比较行数；最后去掉 WHERE 查看全部评分。',
    verification:
      '原查询返回 1 行；= NULL 返回 0 行；无条件查询返回 3 行。解释为什么缺失评分不能当作 0。',
    pitfall: '空结果不代表语句执行失败。',
    choices: [
      { value: 'sql-select-a', label: '用 rating = NULL' },
      { value: 'sql-select-b', label: '用 rating IS NULL' },
    ],
    answer: 'sql-select-b',
    explanation: 'NULL 的判断规则不同于普通值。',
    reference: sqlite,
  },
  {
    id: 'sql-filter',
    unit: 'sql',
    prerequisites: ['sql-select'],
    title: 'WHERE、排序与 LIMIT',
    question: 'LIMIT 1 会自动找到当前用户的电影吗？',
    paragraphs: [
      'WHERE 限定返回范围，ORDER BY 控制次序，LIMIT 限制数量。这里使用样本用户 A 的固定 ID，不读取真实登录身份。',
      '相同排序值需要稳定的后续排序字段。限制结果数量不是归属校验；先筛选用户，再排序和取条数。',
    ],
    code: `SELECT id, title
FROM movies
WHERE owner_id = '11111111-1111-4111-8111-111111111111'
ORDER BY updated_at DESC, id DESC
LIMIT 1`,
    language: 'sql',
    source: source(repository, 'findByOwnerIdOrderByUpdatedAtDesc'),
    prediction: '将 LIMIT 1 改为 LIMIT 2，会多出哪个用户的数据？',
    exercise: '先执行 LIMIT 1，再改成 2；最后只切换 owner_id 为示例用户 B，保持排序条件不变。',
    verification:
      '用户 A 分别返回 1、2 行；用户 B 返回霸王别姬一行。LIMIT 不会改变 owner_id 条件。',
    pitfall: '查到一条记录，不证明它属于当前用户。',
    choices: [
      { value: 'sql-filter-a', label: '不会，还需要明确的归属条件' },
      { value: 'sql-filter-b', label: '会，数量少就不会越权' },
    ],
    answer: 'sql-filter-a',
    explanation: '数量限制与权限范围不是同一概念。',
    reference: sqlite,
  },
  {
    id: 'sql-insert',
    unit: 'sql',
    prerequisites: ['sql-filter'],
    title: '成功新增与主外键约束',
    question: '插入观看前，movie_id 需要满足什么条件？',
    paragraphs: [
      'INSERT 的列与 VALUES 按位置对应。观看 id 必须唯一，movie_id 必须引用已存在的电影，CURRENT_TIMESTAMP 使用数据库当前时间。',
      '本课先成功插入星际穿越的一次观看，再改变一个条件观察主键或外键错误。电影总数不变，观看次数增加。',
    ],
    code: `INSERT INTO watch_records (
    id, movie_id, watched_on, rating, created_at, updated_at
)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '00000000-0000-4000-8000-000000000001',
    '2026-01-01', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)`,
    language: 'sql',
    source: source(schema, 'REFERENCES movies(id) ON DELETE CASCADE'),
    prediction: '执行一次与原样执行第二次，结果是否相同？',
    exercise:
      '重置样本后执行一次并查询确认；原样重复执行观察主键错误。再重置，把 movie_id 改为 missing-movie，观察外键错误。',
    verification:
      '第一次影响 1 行，观看总数变为 4；第二次主键冲突不再增加记录；缺失父电影时写入失败且观看仍为 3 条。',
    pitfall: '失败实验前先重置样本，避免残留主键错误掩盖外键错误。',
    choices: [
      { value: 'sql-insert-a', label: '只要不是空字符串即可' },
      { value: 'sql-insert-b', label: '必须引用已存在电影的 ID' },
    ],
    answer: 'sql-insert-b',
    explanation: '外键维护引用关系，不会自动创建父电影。',
    reference: sqlite,
  },
  {
    id: 'sql-update',
    unit: 'sql',
    prerequisites: ['sql-insert'],
    title: 'UPDATE、SET 与修改验证',
    question: 'SET 和 WHERE 分别决定什么？',
    paragraphs: [
      'UPDATE 指定表，SET 指定要修改的列和值，WHERE 指定目标行。先 SELECT 确认范围，再单独执行写入，最后重新 SELECT 核对。',
      '本课修改样本影片的备注，不改观看事实。语法正确但 ID 不存在时影响 0 行；评分越界等约束错误则是执行失败。',
    ],
    code: `UPDATE movies
SET notes = '周末重看'
WHERE id = '00000000-0000-4000-8000-000000000001'`,
    language: 'sql',
    source: source(samples, 'notes TEXT'),
    prediction: '把 WHERE 中的 ID 改为 1，数据库会新增一行吗？',
    exercise: '查询该电影的 notes，执行本课 UPDATE，再查询同一 ID；随后改用不存在的 ID 执行。',
    verification:
      '成功更新影响 1 行，备注变为周末重看；不存在的 ID 影响 0 行，没有新增电影或观看记录。',
    pitfall: '不能只看成功状态判断改到了目标；还要核对影响行数和更新后的字段。',
    choices: [
      { value: 'sql-update-a', label: 'SET 决定新值，WHERE 决定目标范围' },
      { value: 'sql-update-b', label: 'SET 决定目标范围，WHERE 决定新值' },
    ],
    answer: 'sql-update-a',
    explanation: '修改内容与筛选范围分别由不同子句表达。',
    reference: sqlite,
  },
  {
    id: 'sql-delete',
    unit: 'sql',
    prerequisites: ['sql-update'],
    title: 'DELETE、空结果与影响行数',
    question: '第二次删除同一条记录，影响 0 行是语法错误吗？',
    paragraphs: [
      'DELETE 删除匹配行，不是把字段设为 NULL。先练习删除一条已存在的观看，避免一开始就引入父表级联删除。',
      '相同删除语句执行第二次时可能匹配不到记录。0 行与约束或语法错误必须区分；SELECT 无匹配时正常返回空集合。',
    ],
    code: `DELETE FROM watch_records
WHERE id = '10000000-0000-4000-8000-000000000001'`,
    language: 'sql',
    source: source(schema, 'CREATE TABLE IF NOT EXISTS watch_records'),
    prediction: '初始观看共 3 条，删除一次再重复删除，各影响几行？',
    exercise:
      '重置样本，查询目标 ID，执行删除并再次查询，再重复执行同一 DELETE。最后尝试 SELECT FROM movies 比较错误。',
    verification:
      '首次删除影响 1 行、观看剩 2 条；再次删除影响 0 行；目标 SELECT 返回空；错误 SELECT 被拒绝。',
    pitfall: '数据库工具拒绝无 WHERE 写入是保护规则，不表示所有数据库原生禁止无 WHERE 删除。',
    choices: [
      { value: 'sql-delete-a', label: '是，未删除任何数据就是 SQL 错误' },
      { value: 'sql-delete-b', label: '不是，只是没有匹配记录' },
    ],
    answer: 'sql-delete-b',
    explanation: '执行是否成功与是否改变数据是两个维度。',
    reference: sqlite,
  },
  {
    id: 'http-request',
    unit: 'http',
    prerequisites: ['java-bridge'],
    title: 'HTTP 方法、路径与请求体',
    question: '新增电影应把资料放在哪里？',
    paragraphs: [
      'POST /api/v1/movies 创建电影；GET 查询，PUT 更新，DELETE 删除。路径变量标识资源，请求体承载允许修改的数据。',
      '调用受保护接口前先注册登录并携带 Authorization: Bearer 凭据；此处只把登录当作操作前提，身份原理在后续单元展开。',
    ],
    code: `POST /api/v1/movies
Content-Type: application/json
Authorization: Bearer <accessToken>

{"title":"星际穿越","director":"诺兰","releaseYear":2014,
 "genres":["科幻"],"notes":"周末想看"}`,
    language: 'http',
    source: source(controller, 'public ApiResponse<MovieResponse> create('),
    prediction: '调用成功后，数据库 id 应由请求体提供还是服务端生成？',
    exercise:
      '新增一部教学电影，记录 HTTP 状态与 data.id，再用该 ID 调用 GET。对照接口测试的请求、andExpect 断言和响应读取。',
    verification:
      '新增返回 201，GET 返回 200 且是同一个 ID。SqliteApiFlowIntegrationTest 中请求准备、调用和断言分别可定位。',
    pitfall: '接口路径不是页面路由；不要把占位 Token 当作可用凭据。',
    choices: [
      { value: 'http-request-a', label: '放在 JSON 请求体中' },
      { value: 'http-request-b', label: '放在数据库文件名中' },
    ],
    answer: 'http-request-a',
    explanation: 'HTTP 请求体是接口数据契约，服务端仍会独立校验。',
    reference: mvc,
  },
  {
    id: 'dto-boundary',
    unit: 'http',
    prerequisites: ['http-request', 'data-model'],
    title: '请求 DTO、响应 DTO 与实体',
    question: '响应中有 watchStatusLabel，数据库必须有同名列吗？',
    paragraphs: [
      'MovieRequest 限定允许输入的影片资料；MovieResponse 组合电影与观看记录，并提供派生状态。Entity 表达持久化数据，不能直接当作任意输入或公开响应。',
      'DTO 可以选择字段、组合数据、承载计算结果；计算通常在 Service 转换中完成。用户密码哈希不应出现在响应中，ownerId 不能由新增请求随意指定。',
    ],
    code: `{"code":0,"message":"操作成功","data":{"watchStatus":"WATCHED","watchStatusLabel":"已看"}}`,
    language: 'json',
    source: source(service, 'WatchStatus status = records.isEmpty()'),
    prediction: '删除最后一条观看后，是否需要额外 UPDATE movies.watch_status？',
    exercise:
      '对照 MovieRequest、MovieResponse、Movie 和 schema，分别找出输入字段、派生字段和数据库列。',
    verification:
      '确认 movies 没有 watch_status 列；MovieRequest 没有 ownerId；能解释响应如何从持久化数据派生。',
    pitfall: 'DTO 不是 Entity 的自动完整复制，也不是要求每个字段在 DTO 内执行计算。',
    choices: [
      { value: 'dto-boundary-a', label: '必须，所有 JSON 字段都有数据库列' },
      { value: 'dto-boundary-b', label: '不必须，DTO 可以包含派生字段' },
    ],
    answer: 'dto-boundary-b',
    explanation: '接口契约和数据库结构承担不同职责。',
    reference: mvc,
  },
  {
    id: 'request-validation',
    unit: 'http',
    prerequisites: ['dto-boundary'],
    title: '校验日期、评分与类型',
    question: '调用方保证评分合法，接口还要校验吗？',
    paragraphs: [
      'Controller 的 @Valid 触发请求 DTO 上的 Bean Validation。观看日期必填且不晚于今天；评分可空，有值时是 1–5 的整数。',
      '数据库约束保护持久化数据，接口校验保护业务规则，二者不能互相完全替代。先看合法请求，再逐个改变评分、日期或类型条件。',
    ],
    code: `@NotNull @PastOrPresent LocalDate watchedOn`,
    language: 'java',
    source: source(
      'movie/dto/WatchRecordRequest.java',
      '@NotNull @PastOrPresent LocalDate watchedOn',
      true,
    ),
    prediction: '评分为空和评分为 0，应得到相同结果吗？',
    exercise:
      '调用观看新增接口，依次提交评分 1、5、null、0、6、1.5 与未来日期；对照测试中的正常与拒绝断言。',
    verification:
      '合法边界和未评分可创建，非法评分与未来日期返回 400。字段校验详情可在 data.fieldErrors 中核对。',
    pitfall: 'Java 的 Integer、JSON 数字解析和 @Min/@Max 各有职责，不能只靠显示规则保证整数。',
    choices: [
      { value: 'request-validation-a', label: '仍要由服务端独立验证' },
      { value: 'request-validation-b', label: '不需要，可以相信调用方' },
    ],
    answer: 'request-validation-a',
    explanation: '请求来自信任边界之外。',
    reference: validation,
  },
  {
    id: 'response-errors',
    unit: 'http',
    prerequisites: ['request-validation'],
    title: '统一响应与异常处理',
    question: '统一 JSON 格式，是否意味着所有响应都应使用 HTTP 200？',
    paragraphs: [
      'ApiResponse 的 code=0 表示成功，data 承载业务对象、列表或分页结果；新增仍返回 HTTP 201。删除电影成功返回 200、data=null。',
      'GlobalExceptionHandler 把异常映射为正确 HTTP 状态及错误 code。400 提供校验详情，401 表示身份缺失或失效，404 用于不存在或不属于当前用户的电影，未知异常返回通用 500。',
    ],
    code: `return ResponseEntity.status(status).body(ApiResponse.failure(status.value(), message, body));`,
    language: 'java',
    source: source(
      'common/exception/GlobalExceptionHandler.java',
      'ApiResponse.failure(status.value(), message, body)',
      true,
    ),
    prediction: '响应 message 写着错误，但 HTTP 200 且 code=0，是否表达了失败？',
    exercise:
      '运行 responseEnvelopeCoversSuccessValidationAndHttpErrors，逐项读懂准备、请求与断言，并核对 400/401/404/405 和空成功数据。',
    verification:
      '在 backend 运行 ./mvnw -o -Dtest=SqliteApiFlowIntegrationTest test；对应状态、code 和 data.fieldErrors 断言通过。',
    pitfall: '不要捕获异常后返回 ApiResponse.success，也不要将异常堆栈或密码哈希作为错误数据返回。',
    choices: [
      { value: 'response-errors-a', label: '是，统一格式必须统一成 200' },
      { value: 'response-errors-b', label: '不是，格式与 HTTP 状态分别表达契约和结果' },
    ],
    answer: 'response-errors-b',
    explanation: '结构一致不代表所有请求处理成功。',
    reference: validation,
  },
  {
    id: 'spring-beans',
    unit: 'spring',
    prerequisites: ['java-bridge', 'response-errors'],
    title: 'Bean 与构造器注入',
    question: 'MovieController 的 MovieService 是谁传入的？',
    paragraphs: [
      'Spring Bean 是由容器管理的对象。@Service 让扫描到的自有业务类注册为 Bean；@Configuration 类中的 @Bean 方法则显式创建并交给容器管理对象，例如 SecurityConfig.passwordEncoder 返回 BCryptPasswordEncoder。两者都不是生成 getter/setter 的工具，Lombok 才属于减少样板代码的工具，本项目不使用。',
      'Controller 声明构造器依赖，容器提供已注册的 MovieService；private final 只固定依赖引用。DTO 是每次请求/响应的数据，Entity 是 JPA 管理的持久化对象，不因为有 getter 就是 Spring Bean。自己 new 的 Service 不会自动得到事务代理。',
    ],
    code: `public MovieController(MovieService movieService) {
    this.movieService = movieService;
}`,
    language: 'java',
    source: source(controller, 'public MovieController(MovieService movieService)', true),
    prediction: '将构造器注入的 Service 换成自己 new 的对象，还能假设容器功能都存在吗？',
    exercise:
      '沿 Controller 和 Service 构造器列出依赖；再定位 SecurityConfig 的 @Bean passwordEncoder，比较自己编写的 Service 与第三方编码器如何注册。不要修改密码算法。',
    verification:
      '能指出对象创建与普通方法调用的区别，列出新增请求用到的依赖，而不是把每个对象都手动创建。',
    pitfall: '注解不是普通 Java 调用自动附带的功能；依赖容器的行为需要经过容器管理路径。',
    choices: [
      { value: 'spring-beans-a', label: 'Spring 创建 Controller 时注入' },
      { value: 'spring-beans-b', label: '每次请求都从 JSON 反序列化成 Service' },
    ],
    answer: 'spring-beans-a',
    explanation: '请求数据与应用依赖是不同类型的对象。',
    reference: beans,
  },
  {
    id: 'request-layers',
    unit: 'spring',
    prerequisites: ['spring-beans'],
    title: '追踪 Controller 到数据库',
    question: 'Controller 是否应该直接编写电影保存与审计规则？',
    paragraphs: [
      'Controller 处理路径、请求体、校验与 HTTP 响应；Service 编排业务；Repository 提供持久化操作。先沿一次新增看完整调用，不在此展开复杂事务传播。',
      '事务注解在这里先理解为整个写入用例一起完成的边界；审计是一项必要业务写入。提交、回滚和代理的详细机制在后续阶段验证。',
    ],
    code: `return ApiResponse.success(movieService.create(request));`,
    language: 'java',
    source: source(controller, 'return ApiResponse.success(movieService.create(request));', true),
    prediction: '新增标题的业务规范化应该在 Controller 还是 Service 中定位？',
    exercise:
      '按顺序定位 MovieController.create、MovieService.create、movieRepository.save 和 toResponse，记录每层输入与输出。',
    verification: '能独立追踪一个正常请求并说明各层职责；知道暂时不必理解日志内部和所有框架注解。',
    pitfall: '阅读完整调用链不等于一开始就深入每个分支；先跟踪成功路径，再验证失败路径。',
    choices: [
      { value: 'request-layers-a', label: '应该，所有逻辑放在入口最方便' },
      { value: 'request-layers-b', label: '不应该，业务规则由 Service 编排' },
    ],
    answer: 'request-layers-b',
    explanation: 'HTTP 入口与业务用例分离便于复用和测试。',
    reference: mvc,
  },
  {
    id: 'entity-mapping',
    unit: 'spring',
    prerequisites: ['request-layers', 'data-model'],
    title: 'Entity、主键与列映射',
    question: 'Java 的 ownerId 与数据库 owner_id 怎样对应？',
    paragraphs: [
      '@Entity 标识持久化实体，@Table 指定表，@Id 指定主键，@Column 指定列映射。UUID 在项目中按 varchar(36) 保存，便于使用 SQL 字符串查询。',
      '列名与 Java 属性名不必相同。构造器与 getter 是普通 Java；注解提供框架所需映射信息。日期和类型转换器在对应专题再展开。',
    ],
    code: `@Column(name = "owner_id", nullable = false, length = 36)
private UUID ownerId;`,
    language: 'java',
    source: source(movie, 'private UUID ownerId;', true),
    prediction: '把数据库列名写进 Java 派生方法中，是否一定能正确解析？',
    exercise:
      '找出 Movie.id、title、ownerId 与对应表列，核对主键与非空约束，再观察请求 DTO 中哪些字段不存在。',
    verification: '能把实体属性和数据库列逐一对应；明确 JPA 映射与请求字段校验不是同一个机制。',
    pitfall: '实体出现字段并不意味着接口必须允许修改或返回该字段。',
    choices: [
      { value: 'entity-mapping-a', label: '靠 @Column 的列名映射' },
      { value: 'entity-mapping-b', label: '数据库只能接受与 Java 完全相同的名字' },
    ],
    answer: 'entity-mapping-a',
    explanation: '属性名和列名属于不同层次。',
    reference: jpa,
  },
  {
    id: 'repository-query',
    unit: 'spring',
    prerequisites: ['entity-mapping'],
    title: 'JpaRepository 与派生查询',
    question: 'findByIdAndOwnerId 的 OwnerId 按什么解析？',
    paragraphs: [
      'JpaRepository<Movie, UUID> 指定实体与主键类型，Spring Data 为接口提供实现。基础 CRUD 不必重复编写，但业务归属条件仍需明确。',
      'findByIdAndOwnerId 按 Movie 属性解析条件，Optional 表示可能查不到。方法名不是任意命名，也不直接使用 owner_id 列名。',
    ],
    code: `Optional<Movie> findByIdAndOwnerId(UUID id, UUID ownerId);`,
    language: 'java',
    source: source(repository, 'Optional<Movie> findByIdAndOwnerId', true),
    prediction: 'ID 存在但所属用户不匹配时，Optional 中会有什么？',
    exercise: '比较 findById 与 findByIdAndOwnerId 的条件；阅读 requireOwnedMovie 如何处理空结果。',
    verification: '能解释泛型、方法派生和 Optional 的用途，指出调用方仍需决定查不到时返回什么。',
    pitfall: '不要用查到 ID 代替数据授权；猜错实体属性名可能使 Repository 初始化失败。',
    choices: [
      { value: 'repository-query-a', label: '按任意 SQL 别名解析' },
      { value: 'repository-query-b', label: '按 Movie.ownerId 属性解析' },
    ],
    answer: 'repository-query-b',
    explanation: '派生查询使用持久化模型的属性路径。',
    reference: jpa,
  },
  {
    id: 'movie-query',
    unit: 'crud',
    prerequisites: ['repository-query', 'sql-filter'],
    title: '查询电影与响应转换',
    question: '查到 Entity 后为什么还调用 toResponse？',
    paragraphs: [
      'getMine 先查询当前用户的电影，再转换为 MovieResponse。单条查询与列表查询应采用一致的归属规则，而不是一个检查用户、另一个直接查全部。',
      'toResponse 把资料、观看历史和派生状态整理成契约。当前课程先观察输出，关联加载细节在多次观看单元展开。',
    ],
    code: `public MovieResponse getMine(UUID id) {
    return toResponse(requireOwnedMovie(id));
}`,
    language: 'java',
    source: source(service, 'public MovieResponse getMine(UUID id)', true),
    prediction: 'toResponse 是否会自动把数据库所有字段都返回？',
    exercise: '调用电影 GET 和列表接口，按同一 ID 找到对应数据，核对电影备注与观看笔记的位置。',
    verification:
      '电影备注位于 data.notes，观看笔记位于 data.watchRecords[].notes；返回值与 MovieResponse 声明一致。',
    pitfall: '响应组合与持久化关联不是相同概念；不要直接返回 Entity 替代契约转换。',
    choices: [
      { value: 'movie-query-a', label: '只按 DTO 契约整理所需数据' },
      { value: 'movie-query-b', label: '只是将所有数据库列换个名字' },
    ],
    answer: 'movie-query-a',
    explanation: '转换层可以选择、组合和派生数据。',
    reference: mvc,
  },
  {
    id: 'movie-create',
    unit: 'crud',
    prerequisites: ['movie-query'],
    title: '新增电影的完整流程',
    question: 'save 返回对象就能证明新增已经提交吗？',
    paragraphs: [
      'create 规范化字段，从当前身份取得归属，生成 UUID 和时间戳，保存电影，写入审计，再生成响应。当前用户先视作已提供的可信上下文，下一阶段解释其来源。',
      '电影与必要审计共享事务，只有事务提交成功才应交付成功响应。此处先识别写入边界，不混入独立事务实验。',
    ],
    code: `Movie saved = movieRepository.save(movie);
log("MOVIE_CREATE", saved, null, toResponse(saved));
return toResponse(saved);`,
    language: 'java',
    source: source(service, 'log("MOVIE_CREATE", saved, null, toResponse(saved));', true),
    prediction: '创建请求未提供 ID 和创建时间，响应中为什么会有？',
    exercise:
      '准备一个合法请求，新增后 GET 确认，再用 SQL 查询该 ID。定位规范化、构造实体和日志调用。',
    verification:
      '接口与数据库中的 ID、标题和归属一致；接口测试以 201 和具体字段断言证明正常路径。',
    pitfall: 'save 方法返回不是最终提交证据，日志也不是与本用例无关的旁支。',
    choices: [
      { value: 'movie-create-a', label: '能，方法一返回就一定已经提交' },
      { value: 'movie-create-b', label: '不能，还需事务最终提交成功' },
    ],
    answer: 'movie-create-b',
    explanation: '方法执行完成与事务完成有不同边界。',
    reference: tx,
  },
  {
    id: 'movie-update',
    unit: 'crud',
    prerequisites: ['movie-create', 'java-objects'],
    title: '更新电影与受管实体',
    question: '没有再次调用 save，修改为什么仍可写入数据库？',
    paragraphs: [
      'update 在事务中查询 Movie，生成 before 快照，再修改影片资料并保存 after 审计。movie.update 同步改变内存属性，因此后续转换立即读到新值。',
      '查询得到的受管实体会被 JPA 跟踪，flush 时同步变化，提交成功才完成更新。普通 new 或已脱管对象不能套用这个结论，完整时序在事务阶段验证。',
    ],
    code: `Movie movie = requireOwnedMovie(id);
MovieResponse before = toResponse(movie);`,
    language: 'java',
    source: source(service, 'public MovieResponse update(UUID id, MovieRequest request)', true),
    prediction: '只修改片名，先前观看记录中的评分会跟着变化吗？',
    exercise:
      '添加两次观看后更新片名，再次 GET，比较影片资料、观看历史与 MOVIE_UPDATE 的 before/after。',
    verification: '标题更新但观看历史保持不变；能指出受管实体、对象修改、同步与提交分别表示什么。',
    pitfall: 'JPA 脏检查不是所有 Java 对象都具备的自动保存能力。',
    choices: [
      { value: 'movie-update-a', label: 'JPA 跟踪当前事务中的受管实体' },
      { value: 'movie-update-b', label: '所有 setter 都自动执行 SQL' },
    ],
    answer: 'movie-update-a',
    explanation: '持久化上下文使该对象的变化可被跟踪。',
    reference: jpa,
  },
  {
    id: 'movie-delete',
    unit: 'crud',
    prerequisites: ['movie-update'],
    title: '删除电影与删除前快照',
    question: '删除电影前，为什么还要查询一次归属？',
    paragraphs: [
      'delete 先按当前用户查到目标，再删除实体，并保存删除前的完整快照。查不到时返回 404，不按调用方提供的任意 ID 直接删除。',
      '先用无观看记录的电影走通正常删除；有子记录的删除策略留到关联单元。删除电影成功返回 code=0、data=null，随后 GET 该 ID 应返回 404。',
    ],
    code: `movieRepository.delete(movie);
log("MOVIE_DELETE", movie, toResponse(movie), null);`,
    language: 'java',
    source: source(service, 'log("MOVIE_DELETE", movie, toResponse(movie), null);', true),
    prediction: '第一次删除完成后，第二次删除同一电影的业务接口应返回什么？',
    exercise:
      '创建一部无观看的电影，删除并查询确认，再重复删除。比较业务接口的 404 与直接 SQL 的影响 0 行。',
    verification:
      '首次删除返回 200、data=null；后续 GET 和 DELETE 返回 404；删除日志仍保留 before。',
    pitfall: '业务接口与直接 SQL 对不存在目标的契约可以不同，不能混称为执行失败。',
    choices: [
      { value: 'movie-delete-a', label: '因为 DELETE 必须先 SELECT 才符合 SQL 语法' },
      { value: 'movie-delete-b', label: '为了校验归属并取得审计快照' },
    ],
    answer: 'movie-delete-b',
    explanation: '先查是业务规则，不是 SQL 原生语法要求。',
    reference: jpa,
  },
  {
    id: 'authentication',
    unit: 'identity',
    prerequisites: ['movie-delete'],
    title: '登录校验与 JWT',
    question: '知道用户 ID 就能要求签发该用户的 Token 吗？',
    paragraphs: [
      'AuthService 查找用户并校验密码哈希，成功后生成认证响应。密码不以明文保存，错误邮箱与错误密码使用统一提示。',
      '后续请求携带 Bearer Token，过滤器验证其有效性并建立身份。这里读取现有实现的行为，不要求重写密码或签名算法。',
    ],
    code: `if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
    throw new BusinessException(HttpStatus.UNAUTHORIZED, "邮箱或密码错误");
}`,
    language: 'java',
    source: source('auth/service/AuthService.java', 'passwordEncoder.matches', true),
    prediction: '正确用户 ID 配上错误密码，是否应返回可用 Token？',
    exercise:
      '先成功登录，再分别用错误密码、缺少 Token、无效 Token 访问接口，对照 authenticationAndEnumContracts。',
    verification: '正确身份可访问，错误密码和无效身份返回 401。响应不包含 passwordHash。',
    pitfall: '不要将真实密码、Token 或密钥粘贴到教学样例、SQL 或日志中。',
    choices: [
      { value: 'authentication-a', label: '不能，必须先完成可信身份验证' },
      { value: 'authentication-b', label: '可以，用户 ID 就是登录凭据' },
    ],
    answer: 'authentication-a',
    explanation: '身份标识与认证凭据不是一回事。',
    reference: security,
  },
  {
    id: 'current-user',
    unit: 'identity',
    prerequisites: ['authentication'],
    title: '当前用户与 ownerId',
    question: '电影的 ownerId 为什么不从请求体读取？',
    paragraphs: [
      'CurrentUserService 从 SecurityContext 读取已验证的 UserPrincipal，requireUserId 返回当前身份 ID。Service 将这个值写入电影 ownerId。',
      'userId 强调用户身份，ownerId 强调某条记录的拥有者；当前项目里电影 ownerId 的值是该用户的 ID，但不是电影 ID。',
    ],
    code: `return principal.getId();`,
    language: 'java',
    source: source('security/CurrentUserService.java', 'return principal.getId();', true),
    prediction: '如果允许任意填写 ownerId，调用方能否伪造数据归属？',
    exercise:
      '沿 Token 过滤器、CurrentUserService、MovieService 构造实体的调用顺序，说明身份如何变成 owner_id。',
    verification:
      '指出 MovieRequest 无 ownerId；新电影的 owner_id 来自认证上下文。未知或过期身份不能创建电影。',
    pitfall: '从客户端传来的用户 ID 即使格式正确，也不代表通过认证。',
    choices: [
      { value: 'current-user-a', label: '请求体更短，所以随便省略' },
      { value: 'current-user-b', label: '数据归属必须来自已验证身份' },
    ],
    answer: 'current-user-b',
    explanation: '归属是服务端授权规则的一部分。',
    reference: security,
  },
  {
    id: 'ownership',
    unit: 'identity',
    prerequisites: ['current-user', 'repository-query'],
    title: '认证与资源授权',
    question: '已经登录，为什么仍不能修改另一用户的电影？',
    paragraphs: [
      '认证说明是谁，授权说明可以操作什么。requireOwnedMovie 同时匹配电影 ID 和当前用户 ID，不把知道 UUID 当成权限。',
      '单条查询、更新、删除和观看操作都必须保持相同归属规则。子记录还要匹配父电影，避免把别的观看 ID 搬到当前电影下使用。',
    ],
    code: `return movieRepository.findByIdAndOwnerId(id, currentUserService.requireUserId())
        .orElseThrow(() -> new ResourceNotFoundException("观影记录不存在"));`,
    language: 'java',
    source: source(service, 'findByIdAndOwnerId(id, currentUserService.requireUserId())', true),
    prediction: '用户 B 使用用户 A 的电影 ID 调用 PUT，数据应变化吗？',
    exercise:
      '准备两个用户，分别调用同一电影的 GET、PUT、DELETE。阅读 ownerAndParentBoundariesCoverAllViewingOperations 的拒绝断言。',
    verification: '非拥有者得到 404，原电影和观看记录不变；自己的电影仍可正常访问。',
    pitfall: '直接 SQL 的查询范围不是业务接口自动附带的权限；练习 SQL 只用隔离样本。',
    choices: [
      { value: 'ownership-a', label: 'Token 允许操作任何已知 ID' },
      { value: 'ownership-b', label: '还需要资源归属于当前用户' },
    ],
    answer: 'ownership-b',
    explanation: '身份有效不代表拥有每条记录。',
    reference: security,
  },
  {
    id: 'watch-relationship',
    unit: 'relations',
    prerequisites: ['ownership', 'java-bridge'],
    title: '一对多与观看生命周期',
    question: '从受管观看集合移除元素，为什么可能触发数据库删除？',
    paragraphs: [
      '一部 Movie 对应多条 WatchRecord，每条观看通过 movie_id 引用一个父电影。重看新增子记录，不复制电影资料；观看没有另一份独立 owner_id。',
      'orphanRemoval 使受管关联中被移除的子记录在 flush 时删除。数据库 ON DELETE CASCADE 则覆盖直接 SQL 删除父电影。二者保护不同入口，不能混为同一个机制。',
    ],
    code: `@OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)`,
    language: 'java',
    source: source(movie, 'orphanRemoval = true', true),
    prediction: '删除一条观看与删除父电影，对剩余观看各有什么影响？',
    exercise:
      '对照 Movie.watchRecords、WatchRecord.movie 和 schema 的外键，逐个指出父端、子端及两种删除入口。',
    verification:
      '能解释 remove 只是集合操作，JPA 关联映射和事务才决定其持久化效果；删父电影应清理全部子记录。',
    pitfall: '不要把 cascade = ALL 解释为所有集合移除都自动生效，orphanRemoval 有独立作用。',
    choices: [
      { value: 'watch-relationship-a', label: '因为配置了受管关联的孤儿删除' },
      { value: 'watch-relationship-b', label: '因为 List.remove 自带数据库功能' },
    ],
    answer: 'watch-relationship-a',
    explanation: '普通集合与持久化关联是不同层次。',
    reference: jpa,
  },
  {
    id: 'watch-crud',
    unit: 'relations',
    prerequisites: ['watch-relationship'],
    title: '新增、修改与删除一次观看',
    question: '修改电影资料会覆盖此前观看的评分吗？',
    paragraphs: [
      '观看使用独立 WatchRecordRequest 和子资源接口；每次观看拥有自己的 ID、日期、评分和笔记。修改影片资料与修改一次观看是不同用例。',
      'Service 先验证父电影归属，再定位该电影内的 recordId。每次变更返回更新后的 MovieResponse，已看状态与最近摘要从观看事实派生。',
    ],
    code: `POST /api/v1/movies/{id}/watch-records
PUT /api/v1/movies/{id}/watch-records/{recordId}
DELETE /api/v1/movies/{id}/watch-records/{recordId}`,
    language: 'http',
    source: source(controller, '@PostMapping("/{id}/watch-records")'),
    prediction: '删除最后一条观看后，电影资料是否也应该删除？',
    exercise:
      '为同一电影添加两次不同评分，修改其中一次，然后依次删除；每步重新 GET 比较次数、最近评分与状态。',
    verification:
      '第一次删除保留一次已看，最后一次删除使状态回到想看，影片和备注仍保留；错误父电影或他人记录返回 404。',
    pitfall: '别把 recordId 当成 movieId，也不要在修改电影时顺便覆盖观看事实。',
    choices: [
      { value: 'watch-crud-a', label: '会，整部电影只有一份评分' },
      { value: 'watch-crud-b', label: '不会，影片资料与观看记录分别保存' },
    ],
    answer: 'watch-crud-b',
    explanation: '事实拆分使每次观看的体验可以独立变化。',
    reference: mvc,
  },
  {
    id: 'sql-join',
    unit: 'relations',
    prerequisites: ['watch-crud', 'sql-filter'],
    title: 'JOIN、ON 与 WHERE',
    question: 'LEFT JOIN 会保留没有观看的电影吗？',
    paragraphs: [
      'ON 描述关联条件，WHERE 再筛选结果。先用不带聚合的查询观察一对多产生的多行，需要统计时再查阅聚合专题。',
      'LEFT JOIN 保留左表没有匹配的电影，其观看字段为 NULL；INNER JOIN 只保留有匹配的电影。用户范围仍需显式过滤，不由 JOIN 自动推断。',
    ],
    code: `SELECT m.title, w.watched_on, w.rating
FROM movies m
LEFT JOIN watch_records w ON w.movie_id = m.id
WHERE m.owner_id = '11111111-1111-4111-8111-111111111111'
ORDER BY m.title, w.watched_on`,
    language: 'sql',
    source: source(samples, 'REFERENCES movies(id) ON DELETE CASCADE'),
    prediction: '用户 A 有 2 部电影，其中一部看 2 次，LEFT JOIN 会返回几行？',
    exercise:
      '重置样本执行原查询，再改 INNER JOIN。最后保留 LEFT JOIN 并加 AND w.rating >= 4，观察未看电影是否还在。',
    verification:
      '原查询 3 行，千与千寻的观看字段为空；INNER JOIN 为 2 行；WHERE 限制评分后只剩评分 5 的一行。',
    pitfall: 'WHERE 对右表字段的筛选可能过滤补空行，不能继续假定左表记录全部保留。',
    choices: [
      { value: 'sql-join-a', label: '会，右侧字段以 NULL 补齐' },
      { value: 'sql-join-b', label: '不会，与 INNER JOIN 完全相同' },
    ],
    answer: 'sql-join-a',
    explanation: '保留不匹配左表行是 LEFT JOIN 的关键性质。',
    reference: sqlite,
  },
  {
    id: 'sql-aggregate',
    unit: 'relations',
    prerequisites: ['sql-join', 'sql-select'],
    title: 'COUNT、AVG 与 GROUP BY',
    question: '未看影片的 LEFT JOIN 补空行算一次观看吗？',
    paragraphs: [
      'COUNT(*) 统计结果行，COUNT(w.id) 只统计非空观看 ID。GROUP BY 将同一电影的观看归组，AVG 忽略 NULL 评分。',
      '电影数、观看次数、已评分次数不是同一个统计。没有观看的电影次数为 0、平均分为空；不能用 0 代替未评分再求平均。',
    ],
    code: `SELECT m.title, COUNT(w.id) AS viewing_count, AVG(w.rating) AS average_rating
FROM movies m
LEFT JOIN watch_records w ON w.movie_id = m.id
GROUP BY m.id, m.title
ORDER BY m.title`,
    language: 'sql',
    source: source('movie/entity/WatchRecord.java', 'private Integer rating;'),
    prediction: '星际穿越评分 5 和 3，霸王别姬未评分，各自平均分是什么？',
    exercise:
      '执行原查询，把 COUNT(w.id) 改成 COUNT(*) 比较千与千寻；再单独对全部观看计算 COUNT(rating) 与 AVG(rating)。',
    verification:
      '星际穿越 2 次、均分 4；千与千寻 0 次、均分 NULL；霸王别姬 1 次、均分 NULL。全样本已评分 2 次、均分 4。',
    pitfall: '关联行数不能直接当电影数量，需要区分统计主体。',
    choices: [
      { value: 'sql-aggregate-a', label: '算，COUNT(*) 总能代表观看次数' },
      { value: 'sql-aggregate-b', label: '不算，应统计非空观看 ID' },
    ],
    answer: 'sql-aggregate-b',
    explanation: '补空行不是实际观看事实。',
    reference: sqlite,
  },
  {
    id: 'genres-converter',
    unit: 'relations',
    prerequisites: ['entity-mapping', 'watch-relationship'],
    title: '类型集合与 JSON 转换器',
    question: 'Java List 是否必须映射成一张关联表？',
    paragraphs: [
      'genres 是少量类型标签，当前由 GenresConverter 在 Java List 与 JSON 文本间转换。转换器处理存取表示，不代表任意数组都应该采用相同方案。',
      '观看拥有独立日期、评分和笔记，适合子实体；类型标签当前没有这些独立事实，不需要恢复 movie_genres 表。接口多选与数据库表数不是直接对应关系。',
    ],
    code: `@Convert(converter = GenresConverter.class)
@Column(nullable = false, columnDefinition = "TEXT")
private List<String> genres = List.of();`,
    language: 'java',
    source: source(movie, '@Convert(converter = GenresConverter.class)', true),
    prediction: '将 genres 直接写成非法 JSON 或空数组，是否应当作为合法电影类型？',
    exercise:
      '阅读 GenresConverter 的两个转换方向，运行对应测试；比较 Movie.genres 与 Movie.watchRecords 的映射需求。',
    verification:
      '合法标签集合能往返，非法内容被拒绝；能解释为什么观看独立建表而类型当前使用 JSON 文本。',
    pitfall: '不能为了演示 JOIN 就拆没有当前业务需要的表，也不能把所有一对多都塞进 JSON。',
    choices: [
      { value: 'genres-converter-a', label: '不必须，存储方式取决于当前需求' },
      { value: 'genres-converter-b', label: '必须，所有 List 都只能建子表' },
    ],
    answer: 'genres-converter-a',
    explanation: '接口集合、Java 集合和数据库存储方式处在不同层次。',
    reference: jpa,
  },
  {
    id: 'transaction-commit',
    unit: 'transactions',
    prerequisites: ['watch-crud', 'movie-update'],
    title: 'flush、commit 与回滚',
    question: 'flush 已执行 SQL，事务还可以回滚吗？',
    paragraphs: [
      '普通方法先改变内存对象；flush 把待处理变更同步到数据库；commit 才提交事务。Spring 的事务代理在外层事务方法正常返回后尝试提交，Controller 只有在该边界成功后才拿到正常结果。',
      '测试用 TransactionTemplate 建立外层事务，创建电影和审计并 flush，确认写入发生后抛出异常，再在事务外检查两类数据都已撤销。',
    ],
    code: `entityManager.flush();`,
    language: 'java',
    source: source(transactionTest, 'businessFailureAfterFlushRollsBackBothActualWrites', true),
    prediction: 'flush 后抛运行时异常，最终数据库是否必须保留已执行的 INSERT？',
    exercise: '阅读测试中的事务内查询与事务外断言，说明为何两次检查分别必要；运行指定事务测试。',
    verification:
      '在 backend 运行 ./mvnw -o -Dtest=TransactionConsistencyIntegrationTest test；flush 后故障最终不残留电影和相应审计。',
    pitfall: '若方法加入外层已有事务，不是在每个内层方法返回时独立提交。',
    choices: [
      { value: 'transaction-commit-a', label: '仍能回滚，flush 不等于 commit' },
      { value: 'transaction-commit-b', label: '不能回滚，执行 SQL 就是提交' },
    ],
    answer: 'transaction-commit-a',
    explanation: 'SQL 执行与事务提交是不同事件。',
    reference: tx,
  },
  {
    id: 'transaction-proxy',
    unit: 'transactions',
    prerequisites: ['transaction-commit', 'spring-beans'],
    title: '事务代理与同类调用',
    question: '同一个对象内部调用带事务注解的方法，会重新经过代理吗？',
    paragraphs: [
      '当前项目采用 Spring 常见的代理式事务。外部调用经过代理时，代理按注解建立或加入事务；普通 Java 内部调用不会自动绕回代理。',
      '同类调用也可能处在外层已经开启的事务中，但不能说是内层注解重新开启了事务。测试分别从代理调用和普通内部调用读取事务状态。',
    ],
    code: `assertFalse(experiments.selfInvocation());
assertTrue(experiments.transactionActive());`,
    language: 'java',
    source: source(
      transactionTest,
      'onlyCallsThroughTheSpringProxyStartTheAnnotatedTransaction',
      true,
    ),
    prediction: '从无事务的 selfInvocation 调用 transactionActive，能仅凭内层注解得到事务吗？',
    exercise:
      '定位测试 Bean 的两个方法和外部断言，逐步指出哪些调用经过代理、哪些直接落在同一对象。',
    verification:
      '同类内部调用得到 false，外部代理调用得到 true；测试使用同一个 Spring 管理 Bean，不手动 new 事务服务。',
    pitfall: '不要用同类调用实验推导所有 Spring 部署都没有其他织入模式；本课只解释当前代理配置。',
    choices: [
      { value: 'transaction-proxy-a', label: '会，所有 Java 调用都先经过代理' },
      { value: 'transaction-proxy-b', label: '不会，普通内部调用不触发新的代理拦截' },
    ],
    answer: 'transaction-proxy-b',
    explanation: '注解元数据需要相应拦截机制才产生事务行为。',
    reference: tx,
  },
  {
    id: 'transaction-required',
    unit: 'transactions',
    prerequisites: ['transaction-commit', 'spring-beans'],
    title: 'REQUIRED 与共同提交',
    question: '电影服务调用审计服务，默认会产生两笔独立事务吗？',
    paragraphs: [
      'REQUIRED 有事务就加入，没有才创建。电影和必要审计共享同一物理事务，符合两者一起成功或失败的用例规则。',
      '内层 Service 方法返回，不代表它加入的事务已经独立提交。外层事务失败时，电影和审计应共同回滚；正常情况下共同提交。',
    ],
    code: `@Transactional
public void recordForUser(`,
    language: 'java',
    source: source('oplog/service/OperationLogService.java', 'public void recordForUser(', true),
    prediction: '电影已保存、审计随后失败，外层是否还能按正常成功返回？',
    exercise:
      '沿 MovieService 的事务入口追踪到 OperationLogService，运行 auditFailureRollsBackCreateUpdateAndDelete。',
    verification: '审计故障时创建、更新、删除都回滚；正常路径的电影与日志一起保留。',
    pitfall: '两个方法都有 @Transactional 不等于两笔物理事务。',
    choices: [
      { value: 'transaction-required-a', label: '不会，默认加入已有事务' },
      { value: 'transaction-required-b', label: '会，每个注解固定新建独立事务' },
    ],
    answer: 'transaction-required-a',
    explanation: '传播规则描述的是事务边界，不是方法数量。',
    reference: tx,
  },
  {
    id: 'transaction-catch',
    unit: 'transactions',
    prerequisites: ['transaction-required'],
    title: 'catch 与 rollback-only',
    question: '捕获内层事务异常能清除 rollback-only 标记吗？',
    paragraphs: [
      '共享事务中的内层代理因运行时异常标记 rollback-only 后，外层 catch 只能改变 Java 异常传播，不能自动清除事务状态。',
      '测试让内层 REQUIRED 方法写入并失败，外层捕获后继续返回；最终提交尝试得到 UnexpectedRollbackException，数据库写入仍然撤销。',
    ],
    code: `try {
    experiments.requiredFailure();
} catch (IllegalStateException ignored) {
    // 模拟调用方继续返回，不会清除已有回滚标记。
}`,
    language: 'java',
    source: source(transactionTest, 'catchingAnInnerRequiredFailureDoesNotClearRollbackOnly'),
    prediction: '外层没有再抛原始异常，是否就能保证提交成功？',
    exercise:
      '定位测试中 TransactionTemplate、内层代理和事务外数据库断言，说明 rollback-only 是在哪一层设置的。',
    verification:
      '外层提交时抛 UnexpectedRollbackException；电影和相应日志不残留，而不是只检查异常字符串。',
    pitfall: '普通代码自行捕获一个未经过事务代理的异常，不应一概断言事务一定被标记回滚。',
    choices: [
      { value: 'transaction-catch-a', label: '能，catch 相当于修复事务' },
      { value: 'transaction-catch-b', label: '不能，已有回滚标记仍生效' },
    ],
    answer: 'transaction-catch-b',
    explanation: '异常控制流与事务状态必须分别分析。',
    reference: tx,
  },
  {
    id: 'transaction-checked',
    unit: 'transactions',
    prerequisites: ['transaction-catch'],
    title: '受检异常与 rollbackFor',
    question: '默认抛出 IOException 就一定回滚吗？',
    paragraphs: [
      'Spring 默认对 RuntimeException 和 Error 回滚，受检异常需按业务要求配置 rollbackFor。不是所有异常都具有相同默认规则。',
      '测试分别调用默认受检异常方法与显式配置 IOException 回滚的方法，比较最终数据，而不是只看两次调用都抛出了异常。',
    ],
    code: `@Transactional(rollbackFor = IOException.class)`,
    language: 'java',
    source: source(transactionTest, '@Transactional(rollbackFor = IOException.class)', true),
    prediction: '默认方法与显式 rollbackFor 方法都抛 IOException，电影数量会分别怎样变化？',
    exercise:
      '运行 checkedExceptionDefaultCommitsButExplicitRollbackForRollsBack，核对两次调用后的记录数和日志数。',
    verification: '默认受检异常方法提交一部电影；显式回滚方法不再增加电影，最终仅保留第一笔提交。',
    pitfall: '默认受检异常提交是框架规则，不代表所有业务都应该采用；用例应明确回滚策略。',
    choices: [
      { value: 'transaction-checked-a', label: '不一定，需要分析回滚配置' },
      { value: 'transaction-checked-b', label: '一定，只要有异常就回滚' },
    ],
    answer: 'transaction-checked-a',
    explanation: '异常类型和声明的回滚规则共同决定处理。',
    reference: tx,
  },
  {
    id: 'operation-audit',
    unit: 'delivery',
    prerequisites: ['transaction-required'],
    title: '审计快照与写入结果',
    question: '直接 SQL 已提交、事后日志失败，应报告 SQL 未执行吗？',
    paragraphs: [
      '电影业务审计保存 before/after，并与电影操作共享事务。新增保留 after，更新保留两份，删除保留 before；快照不因为记录被删就消失。',
      '直接 SQL 通过独立连接执行，事后审计失败不能撤销已完成语句。auditRecorded=false 表示审计未记下，不是可以安全重试写入的信号。',
    ],
    code: `{"code":0,"message":"操作成功","data":{"affectedRows":1,"auditRecorded":false}}`,
    language: 'json',
    source: source(
      'lab/service/LabQueryService.java',
      'return response.withAuditRecorded(recorded);',
    ),
    prediction: '收到 auditRecorded=false 后重复执行同一 INSERT，可能发生什么？',
    exercise:
      '运行 auditFailureCannotTurnAnExecutedSqlWriteIntoAnExecutionError，比较 SQL 后实际字段与 auditRecorded，再查看电影删除日志快照。',
    verification:
      'SQL 实际影响 1 行且标题已改变，即使日志故障仍返回真实结果；电影业务的严格审计故障则共同回滚。',
    pitfall: '业务事务与独立 SQL 连接具有不同提交边界，不能用一个通用 catch 把它们混为相同行为。',
    choices: [
      { value: 'operation-audit-a', label: '应报告未执行，鼓励重新提交' },
      { value: 'operation-audit-b', label: '不应，应分别表达执行和审计结果' },
    ],
    answer: 'operation-audit-b',
    explanation: '返回信息必须反映已经发生的持久化结果。',
    reference: tx,
  },
  {
    id: 'pagination',
    unit: 'crud',
    prerequisites: ['movie-query'],
    title: '分页、筛选与统计口径',
    question: '当前页有 2 条，匹配总数一定是 2 吗？',
    paragraphs: [
      'Page 的 content 是当前页内容，totalElements 与 totalPages 描述匹配总量。日志接口将 page 限制为非负，size 限制为 1–100。当前电影接口返回完整 List，不应误认为它已经使用数据库分页。',
      '查询与统计必须采用一致用户和筛选条件。日志 success 筛选不能越过当前用户。新增查询条件时用派生查询或绑定参数，不拼接请求值为 SQL；电影数与观看数也不能按关联行数混算。',
    ],
    code: `int safePage = Math.max(page, 0);
int safeSize = Math.clamp(size, 1, 100);
PageRequest pageable = PageRequest.of(safePage, safeSize);`,
    language: 'java',
    source: source(
      'oplog/service/OperationLogService.java',
      'PageRequest.of(safePage, safeSize)',
      true,
    ),
    prediction: '7 条失败日志、每页 2 条，totalPages 应是多少？',
    exercise:
      '阅读 SQL 失败流程测试中的日志分页断言，改变 page/size 查询，比较 content 与 totalElements；用另一个用户复查隔离。',
    verification: '匹配 7 条时总页数为 4，当前页条数不代替总数；其他用户的统计不混入这些日志。',
    pitfall: '接口已经返回分页对象，不需要额外引入第三方分页框架。',
    choices: [
      { value: 'pagination-a', label: '不一定，总数应读取 totalElements' },
      { value: 'pagination-b', label: '一定，数组长度就是所有数据' },
    ],
    answer: 'pagination-a',
    explanation: '当前页内容与查询匹配总量是不同统计。',
    reference: jpa,
  },
  {
    id: 'independent-change',
    unit: 'delivery',
    prerequisites: ['feature-walkthrough', 'watch-crud'],
    title: '独立修改与回归验证',
    question: '修改一个字段限制，只验证正常请求够吗？',
    paragraphs: [
      '参照发行年份示范，但独立完成不同需求：电影可选原文片名 originalTitle，最大100字符，空白规范化为null；新增、修改、单条、列表和审计快照返回一致，不改变观看历史。先自行写影响清单，不照抄年份数值校验。',
      '在练习副本和一次性测试库补齐 DTO、Entity、手写getter、构造器、update、Service映射和建表定义；已有数据库的结构升级另行设计恢复方案，不在本课自动执行。页面仅作为操作入口，不教授界面实现。',
      '覆盖100/101字符、null、空白、创建再查询、更新再查询、跨用户拒绝及审计失败共同回滚。回看第一次修改：收紧接口限制无需加列，而这个新增持久化字段需要列；能解释二者差异才算完成。',
    ],
    code: `var original = movies.create(input("original"));
failAudit();
assertThrows(RuntimeException.class,
        () -> movies.update(original.id(), input("not updated")));`,
    language: 'java',
    source: source(transactionTest, 'void auditFailureRollsBackCreateUpdateAndDelete()'),
    prediction: '只验证 save 被调用，能证明出错后数据库没残留修改吗？',
    exercise:
      '独立实现 originalTitle，在现有测试加入100/101字符、null、空白、读写一致、越权和失败不变断言。先跑相关测试，再运行 backend 的 ./mvnw test；不修改实际业务库。',
    verification:
      '提交可核对的代码差异、请求与数据库断言；区分单元测试、MockMvc 契约与真实数据库集成测试。Docker 未运行的测试标为跳过，不能算已验证。',
    pitfall: '课程提供代码与选择题不表示已经掌握；独立修改的结果需由实际测试与解释证明。',
    choices: [
      { value: 'independent-change-a', label: '足够，正常请求成功就代表完整' },
      { value: 'independent-change-b', label: '不够，还要验证边界、拒绝与最终数据' },
    ],
    answer: 'independent-change-b',
    explanation: '完整性取决于正常、错误和授权路径，不只看成功调用。',
    reference: testing,
  },
  {
    id: 'requires-new',
    unit: 'transactions',
    prerequisites: ['transaction-required', 'transaction-checked'],
    title: 'REQUIRES_NEW 独立提交实验',
    question: '内层独立提交会随外层回滚一起撤销吗？',
    paragraphs: [
      '本课选修，需要 Docker/MySQL。REQUIRES_NEW 挂起外层事务并使用独立物理事务，需要额外连接；不能把 SQLite 单写者实验直接照搬。',
      '真实测试先让外层写入并 flush，再调用独立 Bean 提交另一笔写入，最后抛异常回滚外层。最终只有独立写入和对应审计保留。',
    ],
    code: `@Transactional(propagation = Propagation.REQUIRES_NEW)`,
    language: 'java',
    source: source(
      'backend/src/test/java/com/example/dblab/MySqlTransactionPropagationIntegrationTest.java',
      '@Transactional(propagation = Propagation.REQUIRES_NEW)',
      true,
    ),
    prediction: '外层先写入并最终回滚后，independent committed 电影是否仍存在？',
    exercise:
      '具备 Docker 时运行 ./mvnw -o -Dtest=MySqlTransactionPropagationIntegrationTest test，观察外层、独立 Bean 和事务外断言。',
    verification:
      '外层电影被撤销，独立电影保留；无 Docker 时测试跳过，继续默认 SQLite 主线即可，不登记为实验通过。',
    pitfall: '不要为绕过 SQLite 锁等待而调整业务顺序、伪造独立提交证据，或将本课设为主线必需步骤。',
    choices: [
      { value: 'requires-new-a', label: '不会，独立事务已单独提交' },
      { value: 'requires-new-b', label: '会，调用栈中所有写入都一起回滚' },
    ],
    answer: 'requires-new-a',
    explanation: '独立物理事务不跟随外层事务回滚。',
    reference: tx,
  },
]

// 学习顺序独立于内容声明位置；专题不成为主线的隐含前置条件。
export const MAIN_ROUTE = [
  'project-start',
  'development-workflow',
  'data-model',
  'java-objects',
  'java-bridge',
  'http-request',
  'dto-boundary',
  'request-validation',
  'first-change',
  'response-errors',
  'spring-beans',
  'request-layers',
  'entity-mapping',
  'repository-query',
  'sql-select',
  'sql-filter',
  'movie-query',
  'pagination',
  'movie-create',
  'movie-update',
  'movie-delete',
  'authentication',
  'current-user',
  'ownership',
  'watch-relationship',
  'watch-crud',
  'sql-join',
  'transaction-commit',
  'transaction-required',
  'operation-audit',
  'feature-walkthrough',
  'independent-change',
] as const
export const TOPIC_ROUTE = [
  'java-collections',
  'sql-insert',
  'sql-update',
  'sql-delete',
  'sql-aggregate',
  'genres-converter',
  'transaction-proxy',
  'transaction-catch',
  'transaction-checked',
  'requires-new',
] as const
const courseOrder: readonly string[] = [...MAIN_ROUTE, ...TOPIC_ROUTE]
export const LESSONS: Lesson[] = [...entries]
  .sort((a, b) => courseOrder.indexOf(a.id) - courseOrder.indexOf(b.id))
  .map((entry, index) => {
    const { choices, answer, explanation, ...content } = entry
    const optional = !MAIN_ROUTE.some((id) => id === entry.id)
    return {
      ...content,
      optional,
      number: index + 1,
      quiz: {
        id: `lesson-${entry.id}`,
        title: entry.question,
        scenario: entry.prediction,
        options: choices,
        answer,
        explanation,
      },
    }
  })

export const REQUIRED_LESSONS = LESSONS.filter((lesson) => !lesson.optional)

/** 主线与专题各自在自己的路线内前后导航，不相互混入。 */
export function lessonNeighbors(lesson: Lesson): { previous?: Lesson; next?: Lesson } {
  const route = lesson.optional ? LESSONS.filter((item) => item.optional) : REQUIRED_LESSONS
  const index = route.findIndex((item) => item.id === lesson.id)
  return { previous: route[index - 1], next: route[index + 1] }
}

/** 沿专题前置找到最近的主线位置，继续其后课程；不把专题当作必修。 */
export function topicMainContinuation(lesson: Lesson): Lesson {
  const pending = [...lesson.prerequisites]
  const visited = new Set<string>()
  let anchor: Lesson | undefined
  while (pending.length) {
    const id = pending.pop()!
    if (visited.has(id)) continue
    visited.add(id)
    const item = LESSONS.find((candidate) => candidate.id === id)
    if (!item) continue
    if (item.optional) pending.push(...item.prerequisites)
    else if (!anchor || item.number > anchor.number) anchor = item
  }
  if (!anchor) return REQUIRED_LESSONS[0]
  return lessonNeighbors(anchor).next ?? anchor
}

export const COURSE_SECTIONS = [
  { id: 'learn-entry', title: '问题与概念', description: '本课前提与必要知识' },
  { id: 'learn-boundary', title: '阅读代码', description: '真实源码与示例边界' },
  { id: 'learn-practice', title: '预测结果', description: '先判断并解释原因' },
  { id: 'learn-verify', title: '操作与验证', description: '改变一个条件再检查' },
  { id: 'learn-reference', title: '资料与后续', description: '主线、专题与参考' },
]
