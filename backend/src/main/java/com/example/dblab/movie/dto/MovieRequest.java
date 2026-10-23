package com.example.dblab.movie.dto;

import jakarta.validation.constraints.*;

import java.util.List;

/** 影片资料与每次观看是两个独立事实，不在修改影片时覆盖观影历史。 */
public record MovieRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 100) String director,
        @NotNull @Size(min = 1, max = 8) List<@NotBlank @Size(max = 40) String> genres,
        @Size(max = 1000) String notes,
        @NotNull @Min(1888) @Max(2100) Integer releaseYear
) {}
