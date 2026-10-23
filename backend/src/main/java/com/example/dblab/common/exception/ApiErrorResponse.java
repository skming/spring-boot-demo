package com.example.dblab.common.exception;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(
        Instant timestamp,
        String path,
        Map<String, String> fieldErrors
) {
}
