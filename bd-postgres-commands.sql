-- Выполнять строго под пользователем postgres в системной базе postgres!
DROP DATABASE IF EXISTS staff;
DROP USER IF EXISTS admin;

CREATE USER admin WITH PASSWORD '1234';
CREATE DATABASE staff OWNER admin;