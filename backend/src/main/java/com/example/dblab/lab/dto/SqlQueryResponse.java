package com.example.dblab.lab.dto;

import java.util.List;
import java.util.Map;

public record SqlQueryResponse(
        String statementType,
        String statementTypeLabel,
        List<String> columns,
        List<Map<String, Object>> rows,
        int rowCount,
        Integer affectedRows,
        boolean truncated,
        long durationMs,
        boolean auditRecorded
) {
    public SqlQueryResponse withAuditRecorded(boolean recorded) {
        return new SqlQueryResponse(statementType, statementTypeLabel, columns, rows, rowCount,
                affectedRows, truncated, durationMs, recorded);
    }
}
