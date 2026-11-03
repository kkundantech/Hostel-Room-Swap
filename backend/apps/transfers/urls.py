from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'transfers', views.TransferRecordViewSet, basename='transfer')

urlpatterns = [path('', include(router.urls))]
