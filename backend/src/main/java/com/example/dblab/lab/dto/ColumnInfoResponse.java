package com.example.dblab.lab.dto;

public record ColumnInfoResponse(
        String columnName,
        String dataType,
        boolean nullable,
        String defaultValue
) {
}
