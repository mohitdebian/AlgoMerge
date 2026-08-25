-- Relational schema design with PK/FK
CREATE TABLE users_demo (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE posts_demo (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users_demo(id));
