from django.http import HttpRequest
from django.db import connection

from typing import Optional

from staffapp.base_api_view import BaseAPIView
from staffapp.position_meta import table_meta
from staffapp.view_utils import get_json_body, patch_in_table
from staffapp.view_utils import api_response, get_from_table, delete_from_table
from staffapp.parsers import parse_by_config, ensure_no_id_in_body, validate_required_fields

class PositionAPIView(BaseAPIView):
    """
    API-представление для работы с должностями.

    Перехват ошибок реализован в базовом классе `BaseAPIView`.
    Методы `get`, `patch` и `delete` используют универсальные функции обработки запросов.
    Метод `post` реализован через прямой параметризованный SQL-запрос для
    наглядности и упрощения тестирования.
    """
    def get(self, request: HttpRequest, id: Optional[int] = None):
        
        return get_from_table(request, id, 'positions')

    def post(self, request: HttpRequest, id: Optional[int] = None):
        # Параметр id в POST запросах не используется

        input_data = get_json_body(request)

        # Наличие id в теле POST запроса не допускается
        # Жизненным циклом id управляет база данных
        ensure_no_id_in_body(table_meta.fields, input_data)

        parsed_data = parse_by_config(
            input_data=input_data, 
            meta_fields=table_meta.fields
        )

        validate_required_fields(
            input_data=input_data, 
            meta_fields=table_meta.fields
        )
    
        title = parsed_data.get('title')
        category = parsed_data.get('category')
        sql = 'INSERT INTO positions (title, category) VALUES (%s, %s) RETURNING id;'
        with connection.cursor() as cursor: 
            cursor.execute(sql, (title, category))
            generated_id = cursor.fetchone()[0]

        return api_response(
            status_code=201, 
            message='Запись успешно сохранена',
            data={ 'id': generated_id }
        )

    def patch(self, request: HttpRequest, id: Optional[int] = None):
        return patch_in_table(request, id, 'positions', table_meta)

    def delete(self, request: HttpRequest, id: Optional[int] = None):
        return delete_from_table(request, id, 'positions')


