"""Serializers for hostel, block, room, bed, and allocation data."""
from rest_framework import serializers
from .models import Hostel, Block, Room, Bed, Allocation
from apps.accounts.serializers import UserMinimalSerializer


class BedSerializer(serializers.ModelSerializer):
    full_label = serializers.ReadOnlyField()
    current_occupant = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = [
            'id', 'room', 'bed_number', 'is_active',
            'is_available_for_exchange', 'full_label', 'current_occupant',
        ]

    def get_current_occupant(self, obj):
        active = obj.allocations.filter(is_active=True).select_related('student').first()
        if active:
            return UserMinimalSerializer(active.student).data
        return None


class RoomSerializer(serializers.ModelSerializer):
    beds = BedSerializer(many=True, read_only=True)
    hostel_name = serializers.SerializerMethodField()
    hostel_code = serializers.SerializerMethodField()
    hostel_id = serializers.SerializerMethodField()
    block_name = serializers.SerializerMethodField()
    occupied_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'block', 'room_number', 'floor', 'room_type',
            'capacity', 'is_active', 'is_available_for_exchange',
            'hostel_name', 'hostel_code', 'hostel_id', 'block_name', 'occupied_count', 'beds',
        ]

    def get_hostel_name(self, obj):
        return obj.block.hostel.name if obj.block and obj.block.hostel else ''

    def get_hostel_code(self, obj):
        return obj.block.hostel.code if obj.block and obj.block.hostel else ''

    def get_hostel_id(self, obj):
        return obj.block.hostel.id if obj.block and obj.block.hostel else None

    def get_block_name(self, obj):
        return obj.block.name if obj.block else ''

    def get_occupied_count(self, obj):
        return Allocation.objects.filter(
            bed__room=obj, is_active=True
        ).count()


class RoomMinimalSerializer(serializers.ModelSerializer):
    """Lightweight room serializer without nested beds."""
    hostel_code = serializers.SerializerMethodField()
    block_name = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'room_number', 'floor', 'room_type', 'capacity', 'hostel_code', 'block_name']

    def get_hostel_code(self, obj):
        return obj.block.hostel.code

    def get_block_name(self, obj):
        return obj.block.name


class BlockSerializer(serializers.ModelSerializer):
    rooms = RoomMinimalSerializer(many=True, read_only=True)
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Block
        fields = [
            'id', 'hostel', 'name', 'floor_count',
            'gender_restriction', 'is_active', 'room_count', 'rooms',
        ]

    def get_room_count(self, obj):
        return obj.rooms.count()


class HostelSerializer(serializers.ModelSerializer):
    blocks = BlockSerializer(many=True, read_only=True)
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    vacant_beds = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'hostel_category', 'eligibility_policy',
            'address', 'total_blocks', 'warden_contact', 'is_active',
            'total_beds', 'occupied_beds', 'vacant_beds', 'blocks',
        ]

    def get_total_beds(self, obj):
        return Bed.objects.filter(
            room__block__hostel=obj, is_active=True
        ).count()

    def get_occupied_beds(self, obj):
        return Allocation.objects.filter(
            bed__room__block__hostel=obj, is_active=True
        ).count()

    def get_vacant_beds(self, obj):
        total = self.get_total_beds(obj)
        occupied = self.get_occupied_beds(obj)
        return total - occupied


class HostelMinimalSerializer(serializers.ModelSerializer):
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    vacant_beds = serializers.SerializerMethodField()
    total_rooms = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'hostel_category', 'eligibility_policy',
            'is_active', 'total_beds', 'occupied_beds', 'vacant_beds', 'total_rooms',
        ]

    def get_total_beds(self, obj):
        return Bed.objects.filter(
            room__block__hostel=obj, is_active=True
        ).count()

    def get_occupied_beds(self, obj):
        return Allocation.objects.filter(
            bed__room__block__hostel=obj, is_active=True
        ).count()

    def get_vacant_beds(self, obj):
        total = self.get_total_beds(obj)
        occupied = self.get_occupied_beds(obj)
        return max(0, total - occupied)

    def get_total_rooms(self, obj):
        return Room.objects.filter(
            block__hostel=obj, is_active=True
        ).count()


class AllocationSerializer(serializers.ModelSerializer):
    student = UserMinimalSerializer(read_only=True)
    bed_label = serializers.SerializerMethodField()
    hostel_name = serializers.SerializerMethodField()
    block_name = serializers.SerializerMethodField()
    room_number = serializers.SerializerMethodField()

    class Meta:
        model = Allocation
        fields = [
            'id', 'student', 'bed', 'bed_label', 'is_active',
            'allocated_at', 'deallocated_at', 'reason',
            'hostel_name', 'block_name', 'room_number',
            'source_proposal', 'created_at',
        ]

    def get_bed_label(self, obj):
        return obj.bed.full_label

    def get_hostel_name(self, obj):
        return obj.bed.hostel.name

    def get_block_name(self, obj):
        return obj.bed.block.name

    def get_room_number(self, obj):
        return obj.bed.room.room_number
