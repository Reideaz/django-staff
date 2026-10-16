import json
from django import template
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.safestring import mark_safe
from django.utils.html import format_html

register = template.Library()

@register.filter(name='custom_json_script')
def json_script(value, element_id):
    """
    Аналог современного тега json_script для Django 1.11.
    Безопасно переводит Python-объект (включая NamedTuple) в JSON внутри <script></script>.
    """
    if isinstance(value, dict):
        clean_value = value
    else:
        clean_value = namedtuple_to_dict(value)
    
    json_str = json.dumps(clean_value, cls=DjangoJSONEncoder, ensure_ascii=False)
    
    json_str = json_str.replace('<', '\\u003C').replace('>', '\\u003E').replace('&', '\\u0026')
    
    return format_html(
        '<script id="{}" type="application/json">{}</script>',
        element_id,
        mark_safe(json_str)
    )

def namedtuple_to_dict(obj):
    """Рекурсивно превращает NamedTuple (включая вложенные) в обычные dict/list"""
    if hasattr(obj, '_asdict'):
        return {k: namedtuple_to_dict(v) for k, v in obj._asdict().items()}
    elif isinstance(obj, list):
        return [namedtuple_to_dict(v) for v in obj]
    elif isinstance(obj, dict):
        return {k: namedtuple_to_dict(v) for k, v in obj.items()}
    return obj