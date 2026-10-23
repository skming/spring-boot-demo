package com.example.dblab.oplog.service;

import com.example.dblab.oplog.dto.OperationLogPageResponse;
import com.example.dblab.oplog.dto.OperationLogResponse;
import com.example.dblab.oplog.entity.OperationLog;
import com.example.dblab.oplog.repository.OperationLogRepository;
import com.example.dblab.security.CurrentUserService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 写入并查询当前用户的操作日志。
 * <p>
 * 业务审计使用 REQUIRED：电影、注册、登录与审计共同成功，失败向调用方传播。
 * SQL 工作台已独立执行的语句不可由这里回滚，由调用方单独处理审计失败。
 */
@Service
public class OperationLogService {

    private static final int MESSAGE_LIMIT = 500;

    private final OperationLogRepository operationLogRepository;
    private final CurrentUserService currentUserService;

    public OperationLogService(
            OperationLogRepository operationLogRepository,
            CurrentUserService currentUserService
    ) {
        this.operationLogRepository = operationLogRepository;
        this.currentUserService = currentUserService;
    }

    /** 为当前认证用户保存一条操作审计。 */
    @Transactional
    public void record(
            String action,
            String resourceType,
            String resourceId,
            String detail,
            boolean success,
            String message
    ) {
        // 内部调用不再经过代理，但 record() 自己已建立或加入 REQUIRED 事务。
        recordForUser(
                currentUserService.requireUserId(),
                action,
                resourceType,
                resourceId,
                detail,
                success,
                message
        );
    }

    /** 登录/注册时尚无 SecurityContext，直接传入 userId。 */
    @Transactional
    public void recordForUser(
            UUID userId,
            String action,
            String resourceType,
            String resourceId,
            String detail,
            boolean success,
            String message
    ) {
        OperationLog entry = new OperationLog(
                UUID.randomUUID(),
                userId,
                action,
                resourceType,
                blankToNull(resourceId),
                detail == null ? "" : detail,
                success,
                truncate(message, MESSAGE_LIMIT),
                Instant.now()
        );
        operationLogRepository.save(entry);
    }

    /** 分页查询当前用户的日志，可按成功或失败筛选。 */
    @Transactional(readOnly = true)
    public OperationLogPageResponse listMine(int page, int size, Boolean success) {
        // HTTP 查询参数不可信：限制每页大小，并始终使用当前认证用户。
        UUID userId = currentUserService.requireUserId();
        int safePage = Math.max(page, 0);
        int safeSize = Math.clamp(size, 1, 100);
        PageRequest pageable = PageRequest.of(safePage, safeSize);

        Page<OperationLog> result = success == null
                ? operationLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                : operationLogRepository.findByUserIdAndSuccessOrderByCreatedAtDesc(userId, success, pageable);

        return new OperationLogPageResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isFirst(),
                result.isLast()
        );
    }

    /** 统计当前用户全部日志或指定结果的日志数量。 */
    @Transactional(readOnly = true)
    public long countMine(Boolean success) {
        UUID userId = currentUserService.requireUserId();
        if (success == null) {
            return operationLogRepository.countByUserId(userId);
        }
        return operationLogRepository.countByUserIdAndSuccess(userId, success);
    }

    private OperationLogResponse toResponse(OperationLog entry) {
        return new OperationLogResponse(
                entry.getId(),
                entry.getAction(),
                entry.getResourceType(),
                entry.getResourceId(),
                entry.getDetail(),
                entry.isSuccess(),
                entry.getMessage(),
                entry.getCreatedAt()
        );
    }

    private static String truncate(String value, int limit) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= limit) {
            return trimmed;
        }
        return trimmed.substring(0, limit - 3) + "...";
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
