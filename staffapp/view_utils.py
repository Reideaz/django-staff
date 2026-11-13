from typing import Any, Optional, Union, Dict
import json

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.db import connection
from staffapp.view_meta import TableMeta
from staffapp.parsers import ensure_no_id_in_body, parse_by_config
from staffapp.parsers import parse_id, ParseError, ParseErrorCollection

def get_from_table(request: HttpRequest, id: Union[int, str, None], table_name: str) -> Union[JsonResponse, HttpResponse]:
    """
    Универсальный обработчик GET-запросов.

    В зависимости от наличия параметра id:
    - При наличии id: возвращает стандартный ответ с одним JSON-объектом конкретной записи
      или ошибку, если запись отсутствует.
    - При отсутствии id: возвращает стандартный ответ с JSON-массивом всех записей таблицы
      с сортировкой по первичному ключу.

    Args:
        request (HttpRequest): Входящий HTTP-запрос.
        id (int, str, None): Уникальный идентификатор записи.
        table_name (str): Имя таблицы в базе данных. Имя необходимо создавать 
                          непосредственно в коде бэкенда, чтобы исключить SQL-инъекции.

    Returns:
        JsonResponse: При передачи одной записи и генерации ошибок 
                      используется JsonResponse.
        HttpResponse: В случае передачи готовой строки JSON из PostgreSQL
                      используется HttpResponse.
    """
    parsed_id = parse_id(id, 'id')

    if parsed_id:
        return get_by_id(parsed_id, table_name)
    else:
        return get_all_raw_json(table_name)

def get_by_id(id: Union[int, str], table_name: str) -> JsonResponse:
    """
    Выполняет SQL-запрос для получения одной записи по id.

    Args:
        id (int, str): Уникальный идентификатор записи.
        table_name (str): Имя таблицы в базе данных. Имя необходимо создавать 
                          непосредственно в коде бэкенда, чтобы исключить SQL-инъекции.
    
    Returns:
        JsonResponse: Возвращает стандартизированный ответ, содержащий
                      данные одной записи.
    """
    sql = f'SELECT * FROM {table_name} WHERE id = %s;'
    with connection.cursor() as cursor:
        cursor.execute(sql, (id,))
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

def get_all_raw_json(table_name: str) -> HttpResponse:
    """
    Оптимизированная функция получения большого массива записей.

    Формирование JSON-массива реализовано на стороне СУБД PostgreSQL с помощью
    функций row_to_json и json_agg. Принудительное указание типа text в sql-запросе 
    необходимо для того, чтобы заблокировать автоматическую десериализацию данных 
    драйвером psycopg. Это позволяет передать готовую JSON-строку из PostgreSQL 
    напрямую в HttpResponse исключая этап повторной сборки объектов.

    Args:
        table_name (str): Имя таблицы в базе данных. Имя необходимо создавать 
                          непосредственно в коде бэкенда, чтобы исключить SQL-инъекции.
    
    Returns:
        HttpResponse: Используется для передачи готовой строки JSON из PostgreSQL.
    """
    sql = f'SELECT json_agg(row_to_json(row))::text FROM (SELECT * FROM {table_name} ORDER BY id) row;'
    with connection.cursor() as cursor: 
        cursor.execute(sql)
        json_cort = cursor.fetchone()

    db_json_str = json_cort[0] if json_cort[0] else '[]'

    # В стандартный ответ подставляется 'db_json_str' без кавычек.
    # За счет этого она остается валидным массивом, а не превращается в строку.
    result_json_str = f"""{{
        "status": "success",
        "message": "Данные найдены",
        "data": {db_json_str}
    }}"""

    # используем HttpResponse вместо JsonResponse для того, чтобы избежать сериализации строки.
    return HttpResponse(result_json_str, content_type='application/json', status=200)

def delete_from_table(request: HttpRequest, id: Union[int, str, None], table_name: str) -> JsonResponse:
    """
    Универсальный обработчик DELETE-запросов.

    Args:
        request (HttpRequest): Входящий HTTP-запрос.
        id (int, str, None): Уникальный идентификатор записи.
        table_name (str): Имя таблицы в базе данных. Имя необходимо создавать 
                          непосредственно в коде бэкенда, чтобы исключить SQL-инъекции.

    Returns:
        JsonResponse: Сообщение в формате JSON с одним из следующий статус кодов:
            - 200 OK: Запись успешно удалена.
            - 400 Bad Request: Не передан id или ошибка валидации данных (ParseError).
            - 404 Not Found: Запись с указанным id не найдена в таблице.
            - 500 Internal Server Error: Непредвиденная ошибка сервера.
    """
    # Наличие id обязательно, надо знать какой ресурс удалять
    parsed_id = parse_id(value=id, field_name='id', required=True)

    sql = f'DELETE FROM {table_name} WHERE id = %s;'
    
    with connection.cursor() as cursor:
        cursor.execute(sql, (parsed_id,))

        # Если ни одна строка не затронута, значит ресурса не было в базе.
        if cursor.rowcount == 0:
            return api_response(
                status_code=404,
                message=f'Запись с id {parsed_id} не найдена'
            )

    return api_response(
        status_code=200, 
        message=f'Запись успешно удалена'
    )

def patch_in_table(
        request: HttpRequest, 
        id: Union[int, str, None], 
        table_name: str, 
        table_meta: TableMeta) -> JsonResponse:
    """
    Универсальный обработчик PATCH-запросов.

    Args:
        request (HttpRequest): Входящий HTTP-запрос.
        id (int, str, None): Уникальный идентификатор записи.
        table_name (str): Имя таблицы в базе данных. Имя необходимо создавать 
                            непосредственно в коде бэкенда, чтобы исключить SQL-инъекции.
        table_meta (TableMeta): Метаданные конкретной таблицы.

    Returns:
        JsonResponse: Ответ в формате JSON.
    """
    # Наличие id обязательно, надо знать какой ресурс обновлять
    parsed_id = parse_id(value=id, field_name='id', required=True)

    json_dict = get_json_body(request)

    # Наличие id в теле запроса не допускается.
    # Жизненным циклом id управляет база данных
    # их изменение бэкендом не допускается.
    ensure_no_id_in_body(table_meta.fields, json_dict)

    parsed_data = parse_by_config(
        input_data=json_dict,
        meta_fields=table_meta.fields
    )

    # Поскольку ключи словаря parsed_data сформированы на основе имен полей из 
    # метаданных, то можно без опасений брать эти ключи и использовать их в 
    # динамическом формировании SQL-строки
    fields_to_update = [f"{field_name} = %s" for field_name in parsed_data.keys()]
    values = list(parsed_data.values())
    values.append(parsed_id)

    sql = f"UPDATE {table_name} SET {', '.join(fields_to_update)} WHERE id = %s;"
    
    with connection.cursor() as cursor:
        cursor.execute(sql, tuple(values))

        # Если ни одна строка не обновилась, значит ресурса нет в базе.
        if cursor.rowcount == 0:
            return api_response(
                status_code=404, 
                message=f'Запись с id {parsed_id} не найдена'
            )

    return api_response(
        status_code=200, 
        message='Запись успешно обновлена'
    )

def get_json_body(request: HttpRequest) -> Dict[str, Any]:
    """Извлекает JSON из тела запроса."""
    data = json.loads(request.body.decode('utf-8'))

    if not isinstance(data, dict):
        raise ParseError("Тело запроса должно быть словарем JSON.")

    return data

def api_response(
        status_code: int, 
        message: str, 
        data: Optional[Any] = None, 
        error_details: Optional[str] = None
    ) -> JsonResponse:
    """
    Функция возвращает стандартный JSON ответ соответствующий 
    интерфейсу ApiResponse на стороне клиента.

    Из ответа исключаются отсутствующие (пустые) поля.
    """

    if (200 <= status_code < 300):
        is_success = True
    else:
        is_success = False

    response_data = {
        'status': 'success' if is_success else 'error',
        'message': message,
    }

    if data is not None:
        response_data['data'] = data

    if error_details is not None:
        response_data['error_details'] = error_details
        
    return JsonResponse(
        response_data, 
        status=status_code,
        json_dumps_params={'ensure_ascii': False}
    )
