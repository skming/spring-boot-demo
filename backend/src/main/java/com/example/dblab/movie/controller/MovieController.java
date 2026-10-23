package com.example.dblab.movie.controller;

import com.example.dblab.common.dto.ApiResponse;

import com.example.dblab.movie.dto.MovieRequest;
import com.example.dblab.movie.dto.MovieResponse;
import com.example.dblab.movie.dto.WatchStatusOption;
import com.example.dblab.movie.dto.WatchRecordRequest;
import com.example.dblab.movie.service.MovieService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/movies")
public class MovieController {
    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MovieResponse> create(@Valid @RequestBody MovieRequest request) {
        return ApiResponse.success(movieService.create(request));
    }

    @GetMapping
    public ApiResponse<List<MovieResponse>> list() {
        return ApiResponse.success(movieService.listMine());
    }

    @GetMapping("/{id}")
    public ApiResponse<MovieResponse> get(@PathVariable UUID id) {
        return ApiResponse.success(movieService.getMine(id));
    }

    @GetMapping("/watch-statuses")
    public ApiResponse<List<WatchStatusOption>> watchStatuses() {
        return ApiResponse.success(movieService.watchStatuses());
    }

    @PutMapping("/{id}")
    public ApiResponse<MovieResponse> update(@PathVariable UUID id, @Valid @RequestBody MovieRequest request) {
        return ApiResponse.success(movieService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        movieService.delete(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/watch-records")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MovieResponse> addWatch(@PathVariable UUID id, @Valid @RequestBody WatchRecordRequest request) {
        return ApiResponse.success(movieService.addWatch(id, request));
    }

    @PutMapping("/{id}/watch-records/{recordId}")
    public ApiResponse<MovieResponse> updateWatch(@PathVariable UUID id, @PathVariable UUID recordId,
                                     @Valid @RequestBody WatchRecordRequest request) {
        return ApiResponse.success(movieService.updateWatch(id, recordId, request));
    }

    @DeleteMapping("/{id}/watch-records/{recordId}")
    public ApiResponse<MovieResponse> deleteWatch(@PathVariable UUID id, @PathVariable UUID recordId) {
        return ApiResponse.success(movieService.deleteWatch(id, recordId));
    }
}
