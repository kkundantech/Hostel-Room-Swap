from django.contrib import admin
from .models import Hostel, Block, Room, Bed, Allocation


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'total_blocks', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('name', 'hostel', 'gender_restriction', 'floor_count', 'is_active')
    list_filter = ('gender_restriction', 'is_active', 'hostel')


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_number', 'block', 'floor', 'room_type', 'capacity', 'is_active')
    list_filter = ('room_type', 'is_active', 'block__hostel')
    search_fields = ('room_number',)


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ('bed_number', 'room', 'is_active', 'is_available_for_exchange')
    list_filter = ('is_active', 'is_available_for_exchange')


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ('student', 'bed', 'is_active', 'allocated_at', 'deallocated_at')
    list_filter = ('is_active',)
    search_fields = ('student__email', 'student__first_name')
    raw_id_fields = ('student', 'bed')
