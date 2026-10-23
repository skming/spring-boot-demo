package com.example.dblab.learning.controller;

import com.example.dblab.common.dto.ApiResponse;

import com.example.dblab.lab.dto.SqlQueryRequest;
import com.example.dblab.lab.dto.SqlQueryResponse;
import com.example.dblab.learning.service.LessonSandboxService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/learning/sandbox")
public class LessonSandboxController {
    private final LessonSandboxService sandbox;
    public LessonSandboxController(LessonSandboxService sandbox) { this.sandbox = sandbox; }

    @PostMapping("/query")
    public ApiResponse<SqlQueryResponse> query(@Valid @RequestBody SqlQueryRequest request) { return ApiResponse.success(sandbox.execute(request.sql())); }

    @PostMapping("/reset")
    public ApiResponse<Void> reset() { sandbox.reset(); return ApiResponse.success(null); }
}
