from django.views import View
from django.http import HttpRequest
from django.shortcuts import render

from staffapp.employee_meta import table_meta

class EmployeesView(View):
    def get(self, request: HttpRequest):
        context = {
            "employee_meta": table_meta 
        }
        return render(request, "staffapp/employees.html", context)
