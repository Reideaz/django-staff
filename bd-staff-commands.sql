-- Следующую команду следует выполнить под пользователем postgres в базе staff.
-- Предоставляем права на public
GRANT ALL ON SCHEMA public TO admin;

-- Переключаемся на пользователя admin.
SET ROLE admin;

-- Следующие команды следует выполнить под пользователем admin в базе staff.

-- Создаем enum типы, чтобы ограничить выбор вариантов.
CREATE TYPE staff_category AS ENUM ('руководитель', 'специалист', 'служащий', 'рабочий');
CREATE TYPE staff_gender AS ENUM ('мужской', 'женский');


-- СОЗДАНИЕ ТАБЛИЦ

-- Таблица должностей
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL UNIQUE, -- Название должности
    category staff_category NOT NULL    -- Категория должности
);

-- Таблица сотрудников
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL, -- ФИО
    gender staff_gender NOT NULL, -- Пол
    age INT NOT NULL, -- Возраст
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,

    CONSTRAINT chk_employees_age 
        CHECK (age >= 1 AND age <= 100)
);


-- НАПОЛНЕНИЕ ТАБЛИЦ ТЕСТОВЫМИ ДАННЫМИ

INSERT INTO positions (title, category) VALUES 
('Генеральный директор', 'руководитель'),
('Главный бухгалтер', 'руководитель'),
('Инженер-программист', 'специалист'),
('Секретарь', 'служащий'),
('Оператор', 'рабочий'),
('Кладовщик', 'рабочий');

INSERT INTO employees (full_name, gender, age, position_id) VALUES 
('Алексеев Алексей Алексеевич', 'мужской', 45, (SELECT id FROM positions WHERE title = 'Генеральный директор')),
('Иванова Мария Сергеевна', 'женский', 38, (SELECT id FROM positions WHERE title = 'Главный бухгалтер')),
('Петров Петр Петрович', 'мужской', 28, (SELECT id FROM positions WHERE title = 'Инженер-программист')),
('Кузнецова Анна Владимировна', 'женский', 24, (SELECT id FROM positions WHERE title = 'Секретарь')),
('Федоров Денис Николаевич', 'мужской', 35, (SELECT id FROM positions WHERE title = 'Оператор')),
('Соколов Андрей Дмитриевич', 'мужской', 42, (SELECT id FROM positions WHERE title = 'Кладовщик'));
