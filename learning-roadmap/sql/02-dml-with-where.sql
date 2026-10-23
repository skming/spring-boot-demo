-- Execute one statement at a time. Replace UUID placeholders first.
-- <current-user-id>: current signed-in user, not an arbitrary user from users.
-- <new-movie-id>: a new standard UUID; prefer the UI "新增一条" template.
INSERT INTO movies (id, title, director, release_year, genres, owner_id, created_at, updated_at)
VALUES ('<new-movie-id>', 'SQL观影演示', '教学导演', 2014, '["科幻"]',
        '<current-user-id>', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Verify the exact target before changing it.
SELECT id, title, genres FROM movies
WHERE id = '<new-movie-id>' AND owner_id = '<current-user-id>';

UPDATE movies
SET genres = '["剧情","科幻"]', updated_at = CURRENT_TIMESTAMP
WHERE id = '<new-movie-id>' AND owner_id = '<current-user-id>';

-- Every viewing gets its own UUID; repeating a viewing does not duplicate the movie.
INSERT INTO watch_records (id, movie_id, watched_on, rating, notes, created_at, updated_at)
SELECT '<new-watch-id>', id, CAST(CURRENT_DATE AS VARCHAR(10)), 5, '本次观看的笔记', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM movies WHERE id = '<new-movie-id>' AND owner_id = '<current-user-id>';

-- Deleting a movie also deletes its viewing history through the foreign key.
DELETE FROM movies
WHERE id = '<new-movie-id>' AND owner_id = '<current-user-id>';

-- Rejected by Lab (no WHERE): DELETE FROM movies;
-- WHERE is a teaching safeguard, not a guarantee of ownership or one affected row.
