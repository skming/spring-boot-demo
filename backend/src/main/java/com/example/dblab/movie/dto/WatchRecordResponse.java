package com.example.dblab.movie.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WatchRecordResponse(UUID id, LocalDate watchedOn, Integer rating, String notes,
                                  Instant createdAt, Instant updatedAt) {}
