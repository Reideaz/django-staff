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

def raise_if_required(required = False, field_name: Optional[str] = None):
    """ Вызывает исключение, если значение обязательно. """
    if required:
        raise ParseError("Поле обязательно для заполнения.", field_name)

def parse_string(
        value,
        required: bool = False,
        max_length: Optional[int] = None,
        field_name: Optional[str] = None
) -> Optional[str]:
    """ Парсинг и валидация строкового поля. """
    if isinstance(value, str):
        value = value.strip()

    if is_empty(value):
        raise_if_required(required, field_name)
        return None
    
    if not isinstance(value, str):
        raise ParseError("Значение должно быть строкой.", field_name)
        
    if max_length and len(value) > max_length:
        raise ParseError(f"Максимальная длина {max_length} символов.", field_name)
        
    return value

def parse_int(
        value,
        required: bool = False,
        min_value: Optional[int] = None,
        max_value: Optional[int] = None,
        field_name: Optional[str] = None
) -> Optional[int]:
    """ Парсинг и валидация числового поля. """
    if is_empty(value):
        raise_if_required(required, field_name)
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
        required: bool = False,
        field_name: Optional[str] = None
) -> Optional[int]:
    """ Парсинг и валидация идентификатора записи. """
    if is_empty(value):
        raise_if_required(required, field_name)
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
        options: List[SelectOption],
        required: bool = False,
        field_name: Optional[str] = None
) -> Optional[str]:
    """ Парсинг и валидация значения по списку вариантов. """
    if isinstance(value, str):
        value = value.strip()

    if is_empty(value):
        raise_if_required(required, field_name)
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

    Функция проходит по всем полям из `meta_fields`, находит соответствующие ключи
    в `input_data` и применяет правила валидации к ним. Процесс не прерывается на первой ошибке, 
    а собирает все обнаруженные проблемы.

    Args:
        input_data (Dict[str, Any]): Входные данные в формате словаря JSON.
        meta_fields (List[FieldMeta]): Список метаданных полей.

    Returns:
        Dict[str, Any]: Словарь проверенных значений.

    Raises:
        ParseErrorCollection: В случае обнаружения ошибок, вызывает исключение содержащее список всех ошибок.
    """
    result_data = {}
    errors = []

    for field in meta_fields:
        try:
            name = field.name
            field_type = field.type
            value = input_data.get(name)

            if field_type in ("id", "foreign_key"):
                result_data[name] = parse_id(
                    value,
                    required=field.required,
                    field_name=field.label
                )
            elif field_type == "number":
                result_data[name] = parse_int(
                    value, 
                    required=field.required,
                    min_value=field.min_value,
                    max_value=field.max_value,
                    field_name=field.label 
                )
            elif field_type == "string":
                result_data[name] = parse_string(
                    value,
                    required=field.required,
                    max_length=field.max_length,
                    field_name=field.label 
                )
            elif field_type == "select":
                options = field.options
                if (options == None):
                    raise AttributeError(
                        'Атрибут "options" обязан присутствовать '
                        'в конфигурации при использовании типа select.'
                    )
                result_data[name] = parse_select(
                    value, 
                    options=options, 
                    required=field.required, 
                    field_name=field.label 
                )
            else:
                raise NotImplementedError
            
        except ParseError as e:
            errors.append(e)

    if errors:
        raise ParseErrorCollection(errors)

    return result_data

def check_missing_fields(json_dict: Dict[str, Any], meta_fields: List[FieldMeta]) -> None:
    """
    Проверяет присутствие всех полей конфигурации в теле запроса независимо от наличия флага required.

    Args:
        json_dict (Dict[str, Any]): Входные данные в формате словаря JSON.
        meta_fields (List[FieldMeta]): Список метаданных полей.

    Raises:
        ParseErrorCollection: Если отсутствует одно или несколько полей.
    """
    config_fields = {field.name for field in meta_fields}
    input_fields = set(json_dict.keys())
    missing_fields = config_fields - input_fields

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
                "Передача уникального идентификатора в теле этого запроса запрещено.",
                field_name=id_field_name
            )

