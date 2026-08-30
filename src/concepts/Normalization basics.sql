-- Normalization basics: 1NF, 2NF, 3NF demonstration

-- 1NF: Atomic values, no repeating groups
CREATE TABLE students_1nf (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL -- Single atomic value per column
);

-- 2NF: Remove partial dependencies (all non-key columns depend on full PK)
CREATE TABLE enrollments_2nf (
  student_id INT REFERENCES students_1nf(id),
  course_id INT,
  grade CHAR(1),
  PRIMARY KEY (student_id, course_id)
);

-- 3NF: Remove transitive dependencies
CREATE TABLE courses_3nf (
  course_id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  department_id INT REFERENCES departments(id) -- No transitive dependency
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  department_name TEXT NOT NULL
);
