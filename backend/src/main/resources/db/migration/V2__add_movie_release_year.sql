alter table movies
    modify column director varchar(100) not null,
    add constraint chk_movies_director check (char_length(trim(director)) > 0),
    add column release_year integer not null,
    add constraint chk_movies_release_year check (release_year between 1888 and 2100);
