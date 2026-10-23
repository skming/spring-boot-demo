package com.example.dblab.oplog.dto;

import java.util.List;

public record OperationLogPageResponse(
        List<OperationLogResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
}
