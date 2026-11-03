from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'admin/policies', views.PolicyRuleViewSet, basename='policy-rule')
router.register(r'policies', views.PolicyRuleViewSet, basename='policy')

urlpatterns = [path('', include(router.urls))]
