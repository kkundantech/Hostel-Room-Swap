from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'approvals', views.ProposalApprovalViewSet, basename='proposal-approval')
router.register(r'approval-records', views.ApprovalViewSet, basename='approval-record')

urlpatterns = [path('', include(router.urls))]
