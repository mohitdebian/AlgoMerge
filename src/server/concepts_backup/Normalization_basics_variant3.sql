-- Normalization (1NF, 2NF, 3NF)
CREATE TABLE authors (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE books (id SERIAL PRIMARY KEY, title TEXT, author_id INT REFERENCES authors(id));
