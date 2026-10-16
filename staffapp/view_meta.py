from typing import NamedTuple, List, Optional

class SelectOption(NamedTuple):
    """
    Вариант выбора для поля типа 'select'.
    """
    value: str
    label: str

class ReferenceMeta(NamedTuple):
    """
    Метаданные для поля типа 'foreign_key'
    """
    api_path: str
    value_field: str
    label_field: str

class FieldMeta(NamedTuple):
    """
    Метаданные отдельного поля таблицы.
    
    Используется для валидации данных и для настройки интерфейса фронтенда.
    """
    name: str
    label: str
    type: str
    editable: bool = True
    hidden: bool = False
    required: bool = False
    unique: bool = False
    max_length: Optional[int] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    options: Optional[List[SelectOption]] = None
    reference: Optional[ReferenceMeta] = None

class TableMeta(NamedTuple):
    """
    Метаданные таблицы базы данных.
    """
    title: str
    fields: List[FieldMeta]
