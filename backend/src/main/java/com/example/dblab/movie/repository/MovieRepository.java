package com.example.dblab.movie.repository;

import com.example.dblab.movie.entity.Movie;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 影片查询与持久化；实体类型为 Movie，主键类型为 UUID。 */
public interface MovieRepository extends JpaRepository<Movie, UUID> {
    /** 按更新时间倒序查询指定用户的全部影片，同时加载观看历史。 */
    @EntityGraph(attributePaths = "watchRecords")
    List<Movie> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    /** 按影片 ID 与所属用户查询，未匹配时返回空结果。 */
    @EntityGraph(attributePaths = "watchRecords")
    Optional<Movie> findByIdAndOwnerId(UUID id, UUID ownerId);

    /** 查询指定用户在指定年份发行的电影，同时加载观影历史。 */
    @EntityGraph(attributePaths = "watchRecords")
    @Query("""
        SELECT m
        FROM Movie m
        WHERE m.ownerId = :ownerId
          AND m.releaseYear = :releaseYear
        """)
    List<Movie> findByOwnerIdAndReleaseYear(
            @Param("ownerId") UUID ownerId,
            @Param("releaseYear") Integer releaseYear
    );
}
