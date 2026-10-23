package com.example.dblab.movie.service;

import com.example.dblab.common.exception.ResourceNotFoundException;
import com.example.dblab.movie.dto.MovieRequest;
import com.example.dblab.movie.dto.MovieResponse;
import com.example.dblab.movie.dto.WatchStatusOption;
import com.example.dblab.movie.dto.WatchRecordRequest;
import com.example.dblab.movie.dto.WatchRecordResponse;
import com.example.dblab.movie.entity.WatchRecord;
import java.util.Comparator;
import com.example.dblab.movie.entity.WatchStatus;
import java.util.Arrays;
import com.example.dblab.movie.entity.Movie;
import com.example.dblab.movie.repository.MovieRepository;
import com.example.dblab.oplog.service.OperationLogService;
import com.example.dblab.security.CurrentUserService;
import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** 所有 API 操作限定当前用户归属；直接 SQL 工作台只用于本地教学。 */
@Service
public class MovieService {
    private final MovieRepository movieRepository;
    private final CurrentUserService currentUserService;
    private final OperationLogService operationLogService;
    private final JsonMapper jsonMapper;

    public MovieService(MovieRepository movieRepository, CurrentUserService currentUserService,
                        OperationLogService operationLogService, JsonMapper jsonMapper) {
        this.movieRepository = movieRepository;
        this.currentUserService = currentUserService;
        this.operationLogService = operationLogService;
        this.jsonMapper = jsonMapper;
    }

    /** 新增影片，并在同一事务中保存新增审计。 */
    @Transactional
    public MovieResponse create(MovieRequest request) {
        Instant now = Instant.now();
        Movie movie = new Movie(UUID.randomUUID(), request.title().trim(), blankToNull(request.director()),
                normalizeGenres(request.genres()),
                blankToNull(request.notes()), currentUserService.requireUserId(), now, now, request.releaseYear());
        Movie saved = movieRepository.save(movie);
        log("MOVIE_CREATE", saved, null, toResponse(saved));
        return toResponse(saved);
    }

    /** 查询当前用户的完整片单及观看历史。 */
    @Transactional(readOnly = true)
    public List<MovieResponse> listMine() {
        return movieRepository.findByOwnerIdOrderByUpdatedAtDesc(currentUserService.requireUserId()).stream()
                .map(this::toResponse).toList();
    }

    /** 返回观影状态的枚举值与展示描述。 */
    public List<WatchStatusOption> watchStatuses() {
        return Arrays.stream(WatchStatus.values())
                .map(status -> new WatchStatusOption(status, status.getLabel())).toList();
    }

    /** 查询当前用户的一部影片。 */
    @Transactional(readOnly = true)
    public MovieResponse getMine(UUID id) {
        return toResponse(requireOwnedMovie(id));
    }

    /** 更新影片基本资料，不修改观看历史。 */
    @Transactional
    public MovieResponse update(UUID id, MovieRequest request) {
        Movie movie = requireOwnedMovie(id);
        MovieResponse before = toResponse(movie);
        movie.update(request.title().trim(), blankToNull(request.director()), normalizeGenres(request.genres()),
                blankToNull(request.notes()), Instant.now(), request.releaseYear());
        log("MOVIE_UPDATE", movie, before, toResponse(movie));
        return toResponse(movie);
    }

    /** 删除影片及其全部观看记录，保存删除前快照。 */
    @Transactional
    public void delete(UUID id) {
        Movie movie = requireOwnedMovie(id);
        movieRepository.delete(movie);
        log("MOVIE_DELETE", movie, toResponse(movie), null);
    }

    /** 查询当前用户所属的影片，未匹配时抛出 404。 */
    private Movie requireOwnedMovie(UUID id) {
        return movieRepository.findByIdAndOwnerId(id, currentUserService.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("观影记录不存在"));
    }

    /** 为当前用户的一部影片新增一次观看。 */
    @Transactional
    public MovieResponse addWatch(UUID id, WatchRecordRequest request) {
        Movie movie = requireOwnedMovie(id);
        MovieResponse before = toResponse(movie);
        Instant now = Instant.now();
        movie.addWatchRecord(new WatchRecord(UUID.randomUUID(), movie, request.watchedOn(),
                request.rating(), blankToNull(request.notes()), now));
        movie.touch(now);
        log("WATCH_CREATE", movie, before, toResponse(movie));
        return toResponse(movie);
    }

    /** 修改指定影片下的一次观看，并记录修改前后快照。 */
    @Transactional
    public MovieResponse updateWatch(UUID id, UUID recordId, WatchRecordRequest request) {
        Movie movie = requireOwnedMovie(id);
        MovieResponse before = toResponse(movie);
        WatchRecord record = requireWatch(movie, recordId);
        Instant now = Instant.now();
        record.update(request.watchedOn(), request.rating(), blankToNull(request.notes()), now);
        movie.touch(now);
        log("WATCH_UPDATE", movie, before, toResponse(movie));
        return toResponse(movie);
    }

    /** 删除指定影片下的一次观看。 */
    @Transactional
    public MovieResponse deleteWatch(UUID id, UUID recordId) {
        Movie movie = requireOwnedMovie(id);
        MovieResponse before = toResponse(movie);
        movie.removeWatchRecord(requireWatch(movie, recordId));
        movie.touch(Instant.now());
        log("WATCH_DELETE", movie, before, toResponse(movie));
        return toResponse(movie);
    }

    /** 在已校验归属的影片中查找观看记录，未匹配时返回 404。 */
    private WatchRecord requireWatch(Movie movie, UUID recordId) {
        return movie.getWatchRecords().stream().filter(record -> record.getId().equals(recordId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("观影记录不存在"));
    }

    /** 保存影片或观看变更的前后快照。 */
    private void log(String action, Movie movie, MovieResponse before, MovieResponse after) {
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("ownerId", movie.getOwnerId());
        detail.put("before", before);
        detail.put("after", after);
        operationLogService.record(action, "movie", movie.getId().toString(),
                jsonMapper.writeValueAsString(detail), true, "saved");
    }

    /** 转为响应 DTO，按观看日期排序，并计算状态与最近一次观看摘要。 */
    private MovieResponse toResponse(Movie movie) {
        List<WatchRecordResponse> records = movie.getWatchRecords().stream()
                .sorted(Comparator.comparing(WatchRecord::getWatchedOn)
                        .thenComparing(WatchRecord::getCreatedAt).thenComparing(record -> record.getId().toString()).reversed())
                .map(record -> new WatchRecordResponse(record.getId(), record.getWatchedOn(), record.getRating(),
                        record.getNotes(), record.getCreatedAt(), record.getUpdatedAt())).toList();
        WatchStatus status = records.isEmpty() ? WatchStatus.WANT_TO_WATCH : WatchStatus.WATCHED;
        WatchRecordResponse latest = records.isEmpty() ? null : records.getFirst();
        return new MovieResponse(movie.getId(), movie.getTitle(), movie.getDirector(), movie.getGenres(),
                status, status.getLabel(), latest == null ? null : latest.rating(),
                latest == null ? null : latest.watchedOn(), movie.getNotes(),
                movie.getCreatedAt(), movie.getUpdatedAt(), movie.getReleaseYear(), records);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static List<String> normalizeGenres(List<String> genres) {
        return genres.stream().map(String::trim).distinct().sorted().toList();
    }
}
