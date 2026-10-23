package com.example.dblab.oplog.repository;

import com.example.dblab.oplog.entity.OperationLog;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** 按操作者查询、分页和统计操作日志。 */
public interface OperationLogRepository extends JpaRepository<OperationLog, UUID> {

    Page<OperationLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /** 按用户与操作结果分页查询日志。 */
    Page<OperationLog> findByUserIdAndSuccessOrderByCreatedAtDesc(
            UUID userId,
            boolean success,
            Pageable pageable
    );

    /** 统计指定用户的日志总数。 */
    long countByUserId(UUID userId);

    long countByUserIdAndSuccess(UUID userId, boolean success);
}
