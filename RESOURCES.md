# Spring Boot 观影项目学习资料

## Knowledge

- [Spring Data JPA：事务边界](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html)
  用于核对 Service 事务覆盖多个 Repository 调用，以及外层事务决定实际事务配置。
- [Spring：使用 @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
  第一课主资料。用于核对代理调用、默认配置、readOnly 和事务边界。
- [Spring：事务回滚](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html)
  用于核对运行时异常、受检异常与自定义 rollbackFor；区分方法内部处理异常与异常穿过代理。
- [Spring：事务传播](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html)
  用于核对 REQUIRED 共享事务与 rollback-only；第一课只学习与当前调用链有关的部分。
- [当前 MovieService](backend/src/main/java/com/example/dblab/movie/service/MovieService.java)
  本地事实来源。定位 create、save、日志调用与响应转换；源码变更后应重新核对课程。
- [当前 OperationLogService](backend/src/main/java/com/example/dblab/oplog/service/OperationLogService.java)
  本地事实来源。核对默认事务传播、内部调用及异常捕获，不把注释里的意图当作失败隔离保证。
- [现有学习路线](learning-roadmap/README.md)
  后续学习目录；不要求为了本课运行完整应用。
- [现有术语表](learning-roadmap/glossary.md)
  复用已有项目术语，避免另建一份不一致的词汇表。

## Wisdom (Communities)

本课不需要加入社区或对外发问；用户尚未表达社区参与偏好。遇到需要实践经验判断的问题时，再核验并选择具体渠道。
