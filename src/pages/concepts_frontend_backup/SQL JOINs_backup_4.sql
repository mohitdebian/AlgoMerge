-- SQL JOINs
SELECT users_demo.name, posts_demo.title
FROM users_demo
INNER JOIN posts_demo ON users_demo.id = posts_demo.user_id;
