-- Engine: SQLite (default) or MySQL
-- Goal: see which tables exist after backend start

-- SQLite:
--   sqlite3 backend/data/cinema.sqlite < learning-roadmap/sql/00-explore.sql
-- MySQL:
--   mysql -h 127.0.0.1 -u dblab -p dblab < learning-roadmap/sql/00-explore.sql

SELECT 'users' AS probe;
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;

SELECT 'movies' AS probe;
SELECT id, title, genres, owner_id, updated_at FROM movies ORDER BY updated_at DESC LIMIT 10;

SELECT 'watch_records' AS probe;
SELECT movie_id, watched_on, rating, notes FROM watch_records ORDER BY watched_on DESC LIMIT 10;

SELECT 'operation_logs' AS probe;
SELECT action, resource_type, success, created_at FROM operation_logs ORDER BY created_at DESC LIMIT 10;
