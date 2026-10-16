from django.conf.urls import url

from staffapp.positions_view import PositionsView
from staffapp.position_api_view import PositionAPIView
from staffapp.employees_view import EmployeesView
from staffapp.employee_api_view import EmployeeAPIView

urlpatterns = [
    url(r'^positions.html$', PositionsView.as_view(), name='positions'),
    url(r'^api/position/$', PositionAPIView.as_view()),
    url(r'^api/position/(?P<id>\d+)/$', PositionAPIView.as_view()),
    url(r'^employees.html$', EmployeesView.as_view(), name='employees'),
    url(r'^api/employee/$', EmployeeAPIView.as_view()),
    url(r'^api/employee/(?P<id>\d+)/$', EmployeeAPIView.as_view()),
]