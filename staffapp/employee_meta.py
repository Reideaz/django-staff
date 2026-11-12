"""
Файл содержит метаданные таблицы сотрудников.
Используется в функциях валидации полей на бэкенде, а также
определяет настройки полей в интерфейсе фронтенда.
"""

from staffapp.view_meta import TableMeta, FieldMeta, ReferenceMeta, SelectOption

table_meta: TableMeta = TableMeta(
    title="Список сотрудников",
    fields=[
        FieldMeta(
            name="id",
            label="id",
            type="id",
            editable=False,
            hidden=True
        ),
        FieldMeta(
            name="full_name",
            label="ФИО",
            type="string",
            required=True,
            max_length=255
        ),
        FieldMeta(
            name="gender",
            label="Пол",
            type="select",
            required=True,
            options=[
                SelectOption(value="мужской", label="Мужской"),
                SelectOption(value="женский", label="Женский")
            ]
        ),
        FieldMeta(
            name="age",
            label="Возраст",
            type="number",
            required=True,
            min_value=1,
            max_value=100
        ),
        FieldMeta(
            name="position_id",
            label="Должность",
            type="foreign_key",
            required=True,
            reference=ReferenceMeta(
                api_path="/staff/api/position/",
                value_field="id",
                label_field='title'
            )
        ),
        FieldMeta(
            name="category",
            label="Категория",
            type="string",
            editable=False
        )
    ]
)
