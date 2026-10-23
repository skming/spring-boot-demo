# B03 观影记录 CRUD

## 先看

- `movie/controller/MovieController.java`
- `movie/service/MovieService.java`
- `movie/entity/Movie.java`
- `movie/dto/MovieRequest.java`：影片资料校验
- `movie/dto/WatchRecordRequest.java`：观影日期与评分校验
- `movie/entity/WatchRecord.java`：一部电影的多次观看
- `movie/entity/IsoDateConverter.java`：SQL 与 API 日期互读

## 数据库对照

- 创建/更新/删除都会写 `operation_logs`
- 列表：`findByOwnerId...`，只返回当前用户观影记录
- 观看增删改先查当前用户的影片，再检查观看记录属于这部影片
- 修改电影资料不改观看历史；删除电影级联删除观看；状态由观看历史推导

## 完成标准

能说明：为什么别人 Lab 插的、但 `owner_id` 不是你的观影记录，在你的观影记录页看不到。
