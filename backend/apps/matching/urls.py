from django.urls import path
from . import views

urlpatterns = [
    path('matches/', views.matching_status_view, name='match-status'),
    path('matches/run/', views.run_matching_view, name='match-run'),
    path('matching/status/', views.matching_status_view, name='matching-status-alias'),
    path('matching/run/', views.run_matching_view, name='matching-run-alias'),
]
