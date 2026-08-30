-- Relational schema design with PK/FK
CREATE TABLE users_demo (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE posts_demo (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users_demo(id));

-- Normalization basics (1NF, 2NF, 3NF Demonstration)
-- 1NF: Atomic columns (no multiple values in a single column)
CREATE TABLE users_1nf (
    user_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50)
);

-- 2NF: No partial dependency (non-key columns must depend on the whole primary key)
CREATE TABLE roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(50)
);
CREATE TABLE user_roles (
    user_id INT REFERENCES users_1nf(user_id),
    role_id INT REFERENCES roles(role_id),
    PRIMARY KEY (user_id, role_id)
);

-- 3NF: No transitive dependency (non-key columns must not depend on other non-key columns)
CREATE TABLE locations (
    zip_code VARCHAR(10) PRIMARY KEY,
    city VARCHAR(50),
    state VARCHAR(50)
);
CREATE TABLE addresses_3nf (
    address_id INT PRIMARY KEY,
    street VARCHAR(100),
    zip_code VARCHAR(10) REFERENCES locations(zip_code)
);

-- ORM usage (Prisma/Sequelize) equivalent of above schema:
-- Prisma schema:
-- model User {
--   id    Int    @id @default(autoincrement())
--   name  String
--   posts Post[]
-- }
-- model Post {
--   id     Int  @id @default(autoincrement())
--   userId Int
--   user   User @relation(fields: [userId], references: [id])
-- }
-- Sequelize equivalent:
-- const User = sequelize.define('User', { name: DataTypes.STRING });
-- const Post = sequelize.define('Post', { title: DataTypes.STRING });
-- User.hasMany(Post); Post.belongsTo(User);
