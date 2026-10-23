package com.example.dblab.movie.dto;

import com.example.dblab.movie.entity.WatchStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MovieResponse(UUID id, String title, String director, List<String> genres, WatchStatus watchStatus,
                            String watchStatusLabel, Integer rating, LocalDate watchedOn, String notes,
                            Instant createdAt, Instant updatedAt, Integer releaseYear, List<WatchRecordResponse> watchRecords) {
}
