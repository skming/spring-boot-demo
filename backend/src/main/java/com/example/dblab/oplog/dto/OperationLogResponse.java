package com.example.dblab.oplog.dto;

import java.time.Instant;
import java.util.UUID;

public record OperationLogResponse(
        UUID id,
        String action,
        String resourceType,
        String resourceId,
        String detail,
        boolean success,
        String message,
        Instant createdAt
) {
}
