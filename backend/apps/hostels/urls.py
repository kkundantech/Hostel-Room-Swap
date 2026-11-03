"""URL routes for hostels."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'hostels', views.HostelViewSet, basename='hostel')
router.register(r'blocks', views.BlockViewSet, basename='block')
router.register(r'rooms', views.RoomViewSet, basename='room')
router.register(r'beds', views.BedViewSet, basename='bed')
router.register(r'occupancy', views.OccupancyViewSet, basename='occupancy')
router.register(r'allocations', views.OccupancyViewSet, basename='allocation')

urlpatterns = [
    path('', include(router.urls)),
]
