from django.views import View
from django.http import HttpRequest, HttpResponse
from django.db import connection

from typing import Optional

from staffapp.employee_meta import table_meta
from staffapp.view_utils import get_json_body
from staffapp.view_utils import api_response, get_from_table, delete_from_table
from staffapp.view_utils import patch_in_table, parse_id
from staffapp.parsers import parse_by_config, ensure_no_id_in_body, validate_required_fields
from staffapp.parsers import ParseError, ParseErrorCollection

class EmployeeAPIView(View):
    def get(self, request: HttpRequest, id: Optional[int] = None):

            # Параметр указывает бэкенду, что нужно обогатить внешнии ключи 
            # дополнительной информацией для интерфейса фронтенда.
            enrich_keys = request.GET.get('enrich_keys', 'false').lower() == 'true'

            if not enrich_keys:
                # Сценарий возврата таблицы в её натуральном виде.
                return get_from_table(request, id, 'employees')

            # Сценарий трансформации внешних ключей в объект вида { value: ' ', label: ' ' }
            try:
                if id is not None:
                    parsed_id = parse_id(id, 'id')

                    # Запрос только одной записи
                    sql = """
                        SELECT 
                            t.id, 
                            t.full_name, 
                            t.gender, 
                            t.age,
                            json_build_object('value', t.position_id::text, 'label', p.title) AS position_id
                        FROM employees t
                        LEFT JOIN positions p ON t.position_id = p.id
                        WHERE t.id = %s;
                    """
                    with connection.cursor() as cursor:
                        cursor.execute(sql, (parsed_id,))
                        row = cursor.fetchone()
                        
                        if row and cursor.description:
                            columns = [col[0] for col in cursor.description]
                            data_dict = dict(zip(columns, row))
                            return api_response(
                                status_code=200, 
                                message='Запись найдена', 
                                data=data_dict
                            )
                        else:
                            return api_response(
                                status_code=404, 
                                message='Запись не найдена'
                            )

                else:
                    # Запрос всего массива записей
                    sql = """
                        SELECT json_agg(row_to_json(row))::text 
                        FROM (
                            SELECT 
                                t.id, 
                                t.full_name, 
                                t.gender, 
                                t.age,
                                json_build_object('value', t.position_id::text, 'label', p.title) AS position_id
                            FROM employees t
                            LEFT JOIN positions p ON t.position_id = p.id
                            ORDER BY t.id
                        ) row;
                    """
                    with connection.cursor() as cursor:
                        cursor.execute(sql)
                        json_cort = cursor.fetchone()

                    db_json_str = json_cort[0] if json_cort and json_cort[0] else '[]'
                    
                    result_json_str = f"""{{
                        "status": "success",
                        "message": "Данные успешно получены",
                        "data": {db_json_str}
                    }}"""
                    
                    return HttpResponse(result_json_str, content_type='application/json', status=200)
                
            except ParseError as e:
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

    def post(self, request: HttpRequest, id: Optional[int] = None):
        try:
            # Параметр id в POST запросах не используется
            
            input_data = get_json_body(request)

            # Наличие id в теле POST запроса не допускается
            # Жизненным циклом id управляет база данных
            ensure_no_id_in_body(table_meta.fields, input_data)

            validate_required_fields(
                input_data=input_data, 
                meta_fields=table_meta.fields
            )

            parsed_data = parse_by_config(
                input_data=input_data, 
                meta_fields=table_meta.fields
            )
        
            full_name = parsed_data.get('full_name')
            gender = parsed_data.get('gender')
            age = parsed_data.get('age')
            position_id = parsed_data.get('position_id')
            sql = 'INSERT INTO employees (full_name, gender, age, position_id) VALUES (%s, %s, %s, %s) RETURNING id;'
            with connection.cursor() as cursor: 
                cursor.execute(sql, (full_name, gender, age, position_id))
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
        return patch_in_table(request, id, 'employees', table_meta)

    def delete(self, request: HttpRequest, id: Optional[int] = None):
        return delete_from_table(request, id, 'employees')
