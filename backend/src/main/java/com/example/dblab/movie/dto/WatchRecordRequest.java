package com.example.dblab.movie.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record WatchRecordRequest(@NotNull @PastOrPresent LocalDate watchedOn,
                                 @Min(1) @Max(5) Integer rating,
                                 @Size(max = 1000) String notes) {}
