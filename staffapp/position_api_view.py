from django.views import View
from django.http import HttpRequest
from django.db import connection

from typing import Optional

from staffapp.position_meta import table_meta
from staffapp.view_utils import get_json_body, patch_in_table
from staffapp.view_utils import api_response, get_from_table, delete_from_table
from staffapp.parsers import parse_by_config, ensure_no_id_in_body
from staffapp.parsers import ParseError, ParseErrorCollection

class PositionAPIView(View):

    def get(self, request: HttpRequest, id: Optional[int] = None):
        
        return get_from_table(request, id, 'positions')

    def post(self, request: HttpRequest, id: Optional[int] = None):
        try:
            # Параметр id в POST запросах не используется

            json_dict = get_json_body(request)

            # Наличие id в теле POST запроса не допускается
            ensure_no_id_in_body(table_meta.fields, json_dict)

            parsed_data = parse_by_config(
                input_data=json_dict, 
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
        
        except (ParseErrorCollection, ParseError) as e:
            return api_response(
                status_code=400,
                message='Ошибка валидации данных',
                error_details=str(e)
            )
    
        except Exception as e:
            return api_response(
                status_code=500, 
                message='Непредвиденная ошибка сервера', 
                error_details=str(e)
            )

    def patch(self, request: HttpRequest, id: Optional[int] = None):
        return patch_in_table(request, id, "employees", table_meta)

    def delete(self, request: HttpRequest, id: Optional[int] = None):
        return delete_from_table(request, id, 'positions')


