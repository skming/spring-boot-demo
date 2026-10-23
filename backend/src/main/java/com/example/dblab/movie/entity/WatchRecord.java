package com.example.dblab.movie.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 一次观看的日期、评分和笔记，对应 watch_records 表。 */
@Entity
@Table(name = "watch_records")
public class WatchRecord {
    @Id @JdbcTypeCode(SqlTypes.VARCHAR) @Column(length = 36)
    private UUID id;
    /** 本次观看所属的影片，使用 movie_id 外键关联。 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;
    /** 观影日期，以 yyyy-MM-dd 文本存储。 */
    @Convert(converter = IsoDateConverter.class)
    @Column(name = "watched_on", nullable = false, length = 10)
    private LocalDate watchedOn;
    /** 本次评分，1–5 星，未评分时为空。 */
    private Integer rating;
    /** 本次观影笔记，最多 1000 字符。 */
    @Column(length = 1000)
    private String notes;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WatchRecord() {}
    public WatchRecord(UUID id, Movie movie, LocalDate watchedOn, Integer rating, String notes, Instant now) {
        this.id = id;
        this.movie = movie;
        this.createdAt = now;
        update(watchedOn, rating, notes, now);
    }
    /** 更新本次观看的日期、评分、笔记及修改时间。 */
    public void update(LocalDate watchedOn, Integer rating, String notes, Instant now) {
        this.watchedOn = watchedOn;
        this.rating = rating;
        this.notes = notes;
        this.updatedAt = now;
    }
    public UUID getId() { return id; }
    public LocalDate getWatchedOn() { return watchedOn; }
    public Integer getRating() { return rating; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
