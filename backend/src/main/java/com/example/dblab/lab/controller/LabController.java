package com.example.dblab.lab.controller;

import com.example.dblab.common.dto.ApiResponse;

import com.example.dblab.lab.dto.SqlQueryRequest;
import com.example.dblab.lab.dto.SqlQueryResponse;
import com.example.dblab.lab.dto.TableDetailResponse;
import com.example.dblab.lab.dto.TableSummaryResponse;
import com.example.dblab.lab.service.LabMetadataService;
import com.example.dblab.lab.service.LabQueryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 数据库工作台 API：表元数据 + 受控 SQL（查询与增删改）。
 */
@RestController
@RequestMapping("/api/v1/lab")
public class LabController {

    private final LabMetadataService labMetadataService;
    private final LabQueryService labQueryService;

    public LabController(LabMetadataService labMetadataService, LabQueryService labQueryService) {
        this.labMetadataService = labMetadataService;
        this.labQueryService = labQueryService;
    }

    @GetMapping("/tables")
    public ApiResponse<List<TableSummaryResponse>> listTables() {
        return ApiResponse.success(labMetadataService.listTables());
    }

    @GetMapping("/tables/{tableName}")
    public ApiResponse<TableDetailResponse> getTable(@PathVariable String tableName) {
        return ApiResponse.success(labMetadataService.getTable(tableName));
    }

    @PostMapping("/query")
    public ApiResponse<SqlQueryResponse> query(@Valid @RequestBody SqlQueryRequest request) {
        return ApiResponse.success(labQueryService.execute(request.sql()));
    }
}
