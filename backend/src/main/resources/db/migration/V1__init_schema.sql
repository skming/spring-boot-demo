create table users (
    id varchar(36) primary key,
    email varchar(120) not null unique,
    password_hash varchar(100) not null,
    created_at datetime(6) not null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_0900_ai_ci;

create table movies (
    id varchar(36) primary key,
    title varchar(100) not null,
    director varchar(100),
    genres text not null,
    notes varchar(1000),
    owner_id varchar(36) not null,
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    constraint chk_movies_genres check (
        json_valid(genres) and json_type(genres) = 'ARRAY' and json_length(genres) between 1 and 8
    ),
    constraint fk_movies_owner foreign key (owner_id) references users (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_0900_ai_ci;

create index idx_movies_owner_id on movies (owner_id);

create table watch_records (
    id varchar(36) primary key,
    movie_id varchar(36) not null,
    watched_on varchar(10) not null,
    rating integer check (rating is null or rating between 1 and 5),
    notes varchar(1000),
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    constraint fk_watch_records_movie foreign key (movie_id) references movies(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_0900_ai_ci;
create index idx_watch_records_movie_date on watch_records(movie_id, watched_on desc);

create table operation_logs (
    id varchar(36) primary key,
    user_id varchar(36) not null,
    action varchar(40) not null,
    resource_type varchar(40) not null,
    resource_id varchar(80),
    detail longtext not null,
    success boolean not null,
    message varchar(500),
    created_at datetime(6) not null,
    constraint fk_operation_logs_user foreign key (user_id) references users (id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_0900_ai_ci;

create index idx_operation_logs_user_created on operation_logs (user_id, created_at desc);
