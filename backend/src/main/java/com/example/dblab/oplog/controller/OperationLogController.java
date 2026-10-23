package com.example.dblab.oplog.controller;

import com.example.dblab.common.dto.ApiResponse;

import com.example.dblab.oplog.dto.OperationLogPageResponse;
import com.example.dblab.oplog.service.OperationLogService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 操作日志查询入口（支持分页与成功/失败筛选）。
 */
@RestController
@RequestMapping("/api/v1/operation-logs")
public class OperationLogController {

    private final OperationLogService operationLogService;

    public OperationLogController(OperationLogService operationLogService) {
        this.operationLogService = operationLogService;
    }

    @GetMapping
    public ApiResponse<OperationLogPageResponse> listMine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Boolean success
    ) {
        return ApiResponse.success(operationLogService.listMine(page, size, success));
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Long>> stats() {
        long total = operationLogService.countMine(null);
        long successCount = operationLogService.countMine(true);
        long failedCount = operationLogService.countMine(false);
        return ApiResponse.success(Map.of(
                "total", total,
                "success", successCount,
                "failed", failedCount
        ));
    }
}
