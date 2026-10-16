from django.views import View
from django.http import HttpRequest
from django.shortcuts import render

from staffapp.position_meta import table_meta

class PositionsView(View):
    def get(self, request: HttpRequest):
        context = {
            "position_meta": table_meta 
        }
        return render(request, "staffapp/positions.html", context)
