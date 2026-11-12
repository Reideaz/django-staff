from django.http import JsonResponse
from django.views import View

from staffapp.view_utils import api_response
from staffapp.parsers import ParseError, ParseErrorCollection

class BaseAPIView(View):
    """Базовый класс для JSON API на основе стандартного View."""

    def dispatch(self, request, *args, **kwargs):
        """Перехват общих ошибок на уровне диспетчера."""
        try:
            return super().dispatch(request, *args, **kwargs)
        
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
