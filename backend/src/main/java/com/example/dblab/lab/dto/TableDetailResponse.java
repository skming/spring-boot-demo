package com.example.dblab.lab.dto;

import java.util.List;

public record TableDetailResponse(
        String tableName,
        List<ColumnInfoResponse> columns,
        List<String> primaryKeys,
        List<String> indexes
) {
}
