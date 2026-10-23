package com.example.dblab.lab.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SqlQueryRequest(
        @NotBlank @Size(max = 5000) String sql
) {
}
