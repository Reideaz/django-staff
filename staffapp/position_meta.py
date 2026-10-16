"""
Файл содержит метаданные таблицы.
Используется в функциях валидации полей на бэкенде, а также
определяет настройки полей в интерфейсе фронтенда.
"""

from staffapp.view_meta import TableMeta, FieldMeta, SelectOption

table_meta: TableMeta = TableMeta(
    title="Список должностей",
    fields=[
        FieldMeta(
            name="id", 
            label="id", 
            type="id", 
            editable=False, 
            hidden=True
        ),
        FieldMeta(
            name="title", 
            label="Название", 
            type="string", 
            required=True, 
            max_length=150, 
            unique=True
        ),
        FieldMeta(
            name="category", 
            label="Категория", 
            type="select", 
            required=True,
            options=[
                SelectOption(value="руководитель", label="Руководитель"),
                SelectOption(value="специалист", label="Специалист"),
                SelectOption(value="служащий", label="Служащий"),
                SelectOption(value="рабочий", label="Рабочий")
            ]
        )
    ]
)