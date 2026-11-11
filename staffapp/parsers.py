from typing import Any, Optional, Union, List, Dict, Iterable
from staffapp.view_meta import SelectOption, FieldMeta

class ParseError(Exception):
    """ Исключение выбрасываемое при ошибке парсинга."""
    def __init__(self, message: str, field_name: Optional[str] = None):
        self.message = message
        self.field_name = field_name
        super().__init__(f'Ошибка в поле {self.field_name}: {self.message}')

    def __str__(self) -> str:
        if self.field_name:
            return f'• {self.field_name}: {self.message}'
        return f'• {self.message}'

class ParseErrorCollection(Exception):
    """
    Коллекция исключений. Объединяет ошибки парсинга по нескольким полям.
    """
    def __init__(self, errors: List[ParseError]):
        self.errors = errors
        super().__init__(f"Обнаружено ошибок валидации: {len(errors)}")

    def __str__(self) -> str:
        return "\n".join([str(e) for e in self.errors])

def is_empty(value) -> bool:
    """
    Проверяет поле на отсутствие значения. Возвращает True, если значение пустое.
    """
    if value is None or value == "":
        return True
    return False

def raise_if_required(field_name: str, required: bool):
    """ Вызывает исключение, если значение обязательно. """
    if required:
        raise ParseError("Не указано обязательное значение.", field_name)

def parse_string(
        value,
        field_name: str,
        max_length: Optional[int] = None,
        required: bool = False
) -> Optional[str]:
    """ Парсинг и валидация строкового поля. """
    if isinstance(value, str):
        value = value.strip()

    if is_empty(value):
        raise_if_required(field_name, required)
        return None
    
    if not isinstance(value, str):
        raise ParseError("Значение должно быть строкой.", field_name)
        
    if max_length and len(value) > max_length:
        raise ParseError(f"Максимальная длина {max_length} символов.", field_name)
        
    return value

def parse_int(
        value,
        field_name: str,
        min_value: Optional[int] = None,
        max_value: Optional[int] = None,
        required: bool = False
) -> Optional[int]:
    """ Парсинг и валидация числового поля. """
    if is_empty(value):
        raise_if_required(field_name, required)
        return None
        
    try:
        parsed_value = int(value)
    except (ValueError, TypeError):
        raise ParseError("Значение должно быть целым числом.", field_name)

    if min_value is not None and parsed_value < min_value:
        raise ParseError(f"Значение не должно быть меньше {min_value}.", field_name)

    if max_value is not None and parsed_value > max_value:
        raise ParseError(f"Значение не должно быть больше {max_value}.", field_name)

    return parsed_value

def parse_id(
        value, 
        field_name: str,
        required: bool = False
) -> Optional[int]:
    """ Парсинг и валидация идентификатора записи. """
    if is_empty(value):
        raise_if_required(field_name, required)
        return None
        
    try:
        parsed_value = int(value)  
    except (ValueError, TypeError):
        raise ParseError("Значение должно быть целым числом.", field_name)

    if parsed_value <= 0:
        raise ParseError("Значение должно быть больше нуля.", field_name)
    return parsed_value
    
def parse_select(
        value, 
        field_name: str,
        options: List[SelectOption],
        required: bool = False
) -> Optional[str]:
    """ Парсинг и валидация значения по списку вариантов. """
    if isinstance(value, str):
        value = value.strip()

    if is_empty(value):
        raise_if_required(field_name, required)
        return None
        
    if not any(option.value == value for option in options):
        raise ParseError(
            f"Выбрано значение, отсутствующее в разрешенном списке.", 
            field_name
        )
        
    return value


def parse_by_config(
        input_data: Dict[str, Any], 
        meta_fields: List[FieldMeta]
) -> Dict[str, Any]:
    """ 
    Парсит и валидирует все входные данные на основе предоставленной конфигурации колонок.

    Функция проходит по всем полям из `input_data`, находит соответствующие ключи
    в `meta_fields` и применяет правила валидации к ним. Неизвестные имена полей записываются 
    в ошибки валидации. Процесс не прерывается на одной ошибке, а собирает все обнаруженные
    проблемы в общую коллекцию.

    Args:
        input_data (Dict[str, Any]): Входные данные в формате словаря JSON.
        meta_fields (List[FieldMeta]): Список метаданных полей.

    Returns:
        Dict[str, Any]: Словарь проверенных значений. Ключи словаря записаны из метаданных.

    Raises:
        ParseErrorCollection: Исключение содержащее коллекцию собранных ошибок.
    """

    # Преобразуем список в словарь для быстрого поиска
    meta_map = {field.name: field for field in meta_fields}

    result_data = {}
    errors = []

    for name, value in input_data.items():
        try:
            field = meta_map.get(name)

            if not field:
                raise ParseError(f"Неизвестное поле.", name)

            field_name = field.name
            field_type = field.type

            if field_type in ("id", "foreign_key"):
                result_data[field_name] = parse_id(
                    value,
                    field_name=field.label,
                    required=field.required
                )
            elif field_type == "number":
                result_data[field_name] = parse_int(
                    value, 
                    field_name=field.label,
                    min_value=field.min_value,
                    max_value=field.max_value,
                    required=field.required
                )
            elif field_type == "string":
                result_data[field_name] = parse_string(
                    value,
                    field_name=field.label,
                    max_length=field.max_length,
                    required=field.required
                )
            elif field_type == "select":
                options = field.options
                if (options == None):
                    raise AttributeError(
                        'Атрибут "options" обязан присутствовать '
                        'в конфигурации при использовании типа select.'
                    )
                result_data[field_name] = parse_select(
                    value, 
                    field_name=field.label,
                    options=options, 
                    required=field.required
                )
            else:
                raise NotImplementedError
            
        except ParseError as e:
            errors.append(e)

    if errors:
        raise ParseErrorCollection(errors)

    return result_data

def check_all_fields(json_dict: Dict[str, Any], meta_fields: List[FieldMeta]) -> None:
    """
    Проверяет присутствие всех полей конфигурации в теле запроса независимо от наличия флага required.

    Args:
        json_dict (Dict[str, Any]): Входные данные в формате словаря JSON.
        meta_fields (List[FieldMeta]): Список метаданных полей.

    Raises:
        ParseErrorCollection: Если отсутствует одно или несколько полей.
    """
    meta_set = {field.name for field in meta_fields}
    input_set = set(json_dict.keys())
    missing_fields = meta_set - input_set

    if missing_fields:
        errors = []
        for field_name in missing_fields:
            error = ParseError(
                message="Поле обязательно для данного запроса.",
                field_name=field_name
            )
            errors.append(error)
            
        raise ParseErrorCollection(errors)

def ensure_no_id_in_body(fields_meta: List[FieldMeta], json_dict: dict):
    """
    Метод выбрасывается ParseError при наличии первичного ключа в теле JSON.
    """
    id_field_name = next((f.name for f in fields_meta if f.type == "id"), None)

    if id_field_name is None:
        raise AttributeError('В метаданных отсутствует уникальный идентификатор записи.')

    if id_field_name in json_dict:
        raise ParseError(
            "Передача уникального идентификатора в теле этого запроса запрещена.",
            field_name=id_field_name
        )

def validate_required_fields(input_data: Dict[str, Any], meta_fields: List[FieldMeta]):
    """
    Проверяет наличие и непустоту всех обязательных полей.
    """
    errors = []
    for field in meta_fields:
            
        value = input_data.get(field.name)
        
        if is_empty(value):
            try:
                raise_if_required(required=field.required, field_name=field.label)
            except ParseError as e:
                errors.append(e)

    if errors:
        raise ParseErrorCollection(errors)
