from django.conf import settings
from django.views import View
from django.db import IntegrityError, DataError

from staffapp.view_utils import api_response
from staffapp.parsers import ParseError, ParseErrorCollection

class BaseAPIView(View):
    """Базовый класс для JSON API на основе стандартного View."""

    def dispatch(self, request, *args, **kwargs):
        """Перехват общих ошибок на уровне диспетчера."""
        try:
            return super().dispatch(request, *args, **kwargs)
        
        except (ParseErrorCollection, ParseError) as e:
            return api_response(
                status_code=400,
                message='Ошибка валидации данных',
                error_details=str(e)
            )

        # Исключения DataError и IntegrityError представляют собой ошибки PostgreSQL.
        # Согласно документации драйвера psycopg2 код ошибки SQLSTATE 
        # хранится в атрибуте `pgcode`.
        # Коды ошибок SQLSTATE взяты из документации:
        # https://www.postgresql.org/docs/11/errcodes-appendix.html

        except IntegrityError as e:
            # Извлекаем исходное исключение драйвера psycopg2 и его SQLSTATE-код
            pgcode = getattr(e.__cause__, 'pgcode', None)

            if pgcode == '23502':
                return api_response(
                    status_code=400,
                    message='Отсутствует обязательное поле',
                    error_details='Не заполнено обязательное поле. Нарушено ограничение NOT NULL.'
                )

            if pgcode == '23503':
                return api_response(
                    status_code=409,
                    message='Операция невозможна: запись связана с другими данными',
                    error_details='Нельзя удалить запись, так как она используется в других таблицах.'
                )

            if pgcode == '23505':
                return api_response(
                    status_code=409,
                    message='Ошибка уникальности данных',
                    error_details='Запись с таким значением уже существует. Нарушено ограничение UNIQUE.'
                )

            if pgcode == '23514':
                return api_response(
                    status_code=400,
                    message='Ошибка ограничений диапазона значений',
                    error_details='Переданное значение не соответствует допустимому диапазону. Нарушено ограничение CHECK.'
                )

            return api_response(
                status_code=400,
                message='Нарушение ограничений или связей таблицы в БД',
                error_details='Переданные данные нарушают правила (ограничения или связи) установленные в таблице.'
            )

        except DataError as e:
            pgcode = getattr(e.__cause__, 'pgcode', None)

            if pgcode == '22001':
                return api_response(
                    status_code=400,
                    message='Превышена длина значения',
                    error_details='Одно из текстовых полей (VARCHAR) превышает максимально допустимую длину.'
                )

            if pgcode == '22003':
                return api_response(
                    status_code=400,
                    message='Числовое значение вне диапазона',
                    error_details='Переданное число выходит за допустимые пределы для типа поля в БД.'
                )

            if pgcode == '22P02':
                return api_response(
                    status_code=400,
                    message='Неверный формат данных',
                    error_details='Некорректное строковое представление значения для целевого типа поля.'
                )

            if pgcode == '22021':
                return api_response(
                    status_code=400,
                    message='Недопустимые символы в тексте',
                    error_details='Строка содержит символы, не поддерживаемые кодировкой базы данных.'
                )

            return api_response(
                status_code=400,
                message='Ошибка формата данных в БД',
                error_details='Одно или несколько значений имеют недопустимый тип или размер.'
            )

        except Exception as e:
            return api_response(
                status_code=500, 
                message='Непредвиденная ошибка сервера', 
                # В разработке выводит сырой текст ошибки, в продакшене - отключен вывод
                error_details=str(e) if settings.DEBUG else None
            )
