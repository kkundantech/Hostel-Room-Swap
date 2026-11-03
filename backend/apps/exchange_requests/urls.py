from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'exchange-requests', views.ExchangeRequestViewSet, basename='exchange-request')
router.register(r'requests', views.ExchangeRequestViewSet, basename='request')

urlpatterns = [path('', include(router.urls))]
