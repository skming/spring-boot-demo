package com.example.dblab.movie.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.util.ArrayList;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 影片基本资料，对应 movies 表；观看历史见 WatchRecord。 */
@Entity
@Table(name = "movies")
public class Movie {

    @Id
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 36)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 100)
    private String director;

    @Convert(converter = GenresConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private List<String> genres = List.of();

    /** 该影片的观看历史，按观看日期倒序；移除元素时删除对应观看记录。 */
    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("watchedOn DESC, createdAt DESC, id DESC")
    private List<WatchRecord> watchRecords = new ArrayList<>();

    /** 电影备注或想看理由。 */
    @Column(length = 1000)
    private String notes;

    /** 所属用户 ID。 */
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "owner_id", nullable = false, length = 36)
    private UUID ownerId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "release_year", nullable = false)
    private Integer releaseYear;

    /** JPA 加载实体使用的无参构造器。 */
    protected Movie() {
    }

    public Movie(UUID id, String title, String director, List<String> genres,
                 String notes, UUID ownerId, Instant createdAt, Instant updatedAt, Integer releaseYear) {
        this.id = id;
        this.ownerId = ownerId;
        this.createdAt = createdAt;
        update(title, director, genres, notes, updatedAt, releaseYear);
    }

    public void update(String title, String director, List<String> genres, String notes, Instant updatedAt, Integer releaseYear) {
        this.title = title;
        this.director = director;
        this.genres = List.copyOf(genres);
        this.notes = notes;
        this.updatedAt = updatedAt;
        this.releaseYear = releaseYear;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDirector() { return director; }
    public List<String> getGenres() {
        return List.copyOf(genres);
    }
    public List<WatchRecord> getWatchRecords() { return List.copyOf(watchRecords); }
    public void addWatchRecord(WatchRecord record) { watchRecords.add(record); }
    public void removeWatchRecord(WatchRecord record) { watchRecords.remove(record); }
    public void touch(Instant instant) { updatedAt = instant; }
    public String getNotes() { return notes; }
    public UUID getOwnerId() { return ownerId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Integer getReleaseYear() {
        return releaseYear;
    }
}
