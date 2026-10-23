-- 片单查询：每条单独放入 Lab；需要限定归属时替换 :owner_id。

SELECT id, title, genres, owner_id, updated_at
FROM movies
ORDER BY updated_at DESC
LIMIT 20;

SELECT m.title, COUNT(w.id) AS viewing_count, AVG(w.rating) AS average_rating
FROM movies m LEFT JOIN watch_records w ON w.movie_id = m.id
GROUP BY m.id, m.title
ORDER BY viewing_count DESC;

SELECT t.title, u.email AS owner_email
FROM movies t
JOIN users u ON u.id = t.owner_id
ORDER BY t.created_at DESC
LIMIT 20;
