CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS movies (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    title VARCHAR(100) NOT NULL,
    director VARCHAR(100) NOT NULL CHECK (length(trim(director)) > 0),
    release_year INTEGER NOT NULL CHECK (typeof(release_year) = 'integer' AND release_year BETWEEN 1888 AND 2100),
    genres TEXT NOT NULL CHECK (json_valid(genres) AND json_type(genres) = 'array' AND json_array_length(genres) BETWEEN 1 AND 8),
    notes VARCHAR(1000),
    owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_movies_owner_id ON movies(owner_id);

CREATE TABLE IF NOT EXISTS watch_records (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    movie_id VARCHAR(36) NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    watched_on VARCHAR(10) NOT NULL,
    rating INTEGER CHECK (rating IS NULL OR (typeof(rating) = 'integer' AND rating BETWEEN 1 AND 5)),
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_watch_records_movie_date ON watch_records(movie_id, watched_on DESC);

CREATE TABLE IF NOT EXISTS operation_logs (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    action VARCHAR(40) NOT NULL,
    resource_type VARCHAR(40) NOT NULL,
    resource_id VARCHAR(80),
    detail TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    message VARCHAR(500),
    created_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_created ON operation_logs(user_id, created_at DESC);
