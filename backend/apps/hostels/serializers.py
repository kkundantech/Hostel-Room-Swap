"""
Module: backend/apps/hostels/serializers.py

Work / Purpose:
    Serializes Hostel, Block, Room, Bed, and Allocation models with nested occupancy metadata.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/hostels/views.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/serializers.py
    - backend/apps/hostels/models.py
    - rest_framework (external library / framework)

Original Module Notes:
    Serializers for hostel, block, room, bed, and allocation data.
"""
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

    def get_current_occupant(self, obj) -> dict | None:
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

    def get_hostel_name(self, obj) -> str:
        return obj.block.hostel.name if obj.block and obj.block.hostel else ''

    def get_hostel_code(self, obj) -> str:
        return obj.block.hostel.code if obj.block and obj.block.hostel else ''

    def get_hostel_id(self, obj) -> int | None:
        return obj.block.hostel.id if obj.block and obj.block.hostel else None

    def get_block_name(self, obj) -> str:
        return obj.block.name if obj.block else ''

    def get_occupied_count(self, obj) -> int:
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

    def get_hostel_code(self, obj) -> str:
        return obj.block.hostel.code

    def get_block_name(self, obj) -> str:
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

    def get_room_count(self, obj) -> int:
        return obj.rooms.count()


class HostelSerializer(serializers.ModelSerializer):
    blocks = BlockSerializer(many=True, read_only=True)
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    vacant_beds = serializers.SerializerMethodField()
    max_floor = serializers.SerializerMethodField()
    floor_count = serializers.SerializerMethodField()
    available_floors = serializers.SerializerMethodField()
    assigned_wardens = serializers.SerializerMethodField()
    assigned_warden_details = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'hostel_category', 'eligibility_policy',
            'address', 'total_blocks', 'warden_contact', 'is_active',
            'total_beds', 'occupied_beds', 'vacant_beds', 'blocks',
            'max_floor', 'floor_count', 'available_floors',
            'assigned_wardens', 'assigned_warden_details',
        ]

    def get_assigned_wardens(self, obj) -> list[str]:
        assignments = obj.warden_assignments.filter(is_active=True).select_related('warden')
        names = [a.warden.get_full_name() or a.warden.email for a in assignments]
        if not names:
            for aw in obj.authorized_wardens.filter(authorization_status='ACTIVE'):
                names.append(aw.full_name or f"Warden {aw.warden_id}")
        return names if names else ['Not Assigned']

    def get_assigned_warden_details(self, obj) -> dict | None:
        assignment = obj.warden_assignments.filter(is_active=True).select_related('warden').first()
        if assignment:
            u = assignment.warden
            return {
                'id': u.id,
                'name': u.get_full_name() or u.email,
                'warden_id': getattr(u, 'warden_id', '') or getattr(u, 'registration_number', ''),
                'email': u.email,
            }
        aw = obj.authorized_wardens.filter(authorization_status='ACTIVE').first()
        if aw:
            return {
                'id': aw.id,
                'name': aw.full_name or f"Warden {aw.warden_id}",
                'warden_id': aw.warden_id,
                'email': aw.email,
            }
        return None

    def get_max_floor(self, obj) -> int:
        from django.db.models import Max
        room_max = Room.objects.filter(block__hostel=obj, is_active=True).aggregate(m=Max('floor'))['m']
        block_max = obj.blocks.filter(is_active=True).aggregate(m=Max('floor_count'))['m']
        return max(room_max or 0, block_max or 0, 1)

    def get_floor_count(self, obj) -> int:
        return self.get_max_floor(obj)

    def get_available_floors(self, obj) -> list:
        floors = list(
            Room.objects.filter(block__hostel=obj, is_active=True)
            .values_list('floor', flat=True)
            .distinct()
            .order_by('floor')
        )
        if not floors:
            return list(range(1, self.get_max_floor(obj) + 1))
        return floors

    def get_total_beds(self, obj) -> int:
        return Bed.objects.filter(
            room__block__hostel=obj, is_active=True
        ).count()

    def get_occupied_beds(self, obj) -> int:
        return Allocation.objects.filter(
            bed__room__block__hostel=obj, is_active=True
        ).count()

    def get_vacant_beds(self, obj) -> int:
        total = self.get_total_beds(obj)
        occupied = self.get_occupied_beds(obj)
        return total - occupied


class HostelMinimalSerializer(serializers.ModelSerializer):
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    vacant_beds = serializers.SerializerMethodField()
    total_rooms = serializers.SerializerMethodField()
    max_floor = serializers.SerializerMethodField()
    floor_count = serializers.SerializerMethodField()
    available_floors = serializers.SerializerMethodField()
    assigned_wardens = serializers.SerializerMethodField()
    assigned_warden_details = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = [
            'id', 'name', 'code', 'hostel_category', 'eligibility_policy',
            'is_active', 'total_beds', 'occupied_beds', 'vacant_beds', 'total_rooms',
            'max_floor', 'floor_count', 'available_floors',
            'assigned_wardens', 'assigned_warden_details',
        ]

    def get_assigned_wardens(self, obj) -> list[str]:
        assignments = obj.warden_assignments.filter(is_active=True).select_related('warden')
        names = [a.warden.get_full_name() or a.warden.email for a in assignments]
        if not names:
            for aw in obj.authorized_wardens.filter(authorization_status='ACTIVE'):
                names.append(aw.full_name or f"Warden {aw.warden_id}")
        return names if names else ['Not Assigned']

    def get_assigned_warden_details(self, obj) -> dict | None:
        assignment = obj.warden_assignments.filter(is_active=True).select_related('warden').first()
        if assignment:
            u = assignment.warden
            return {
                'id': u.id,
                'name': u.get_full_name() or u.email,
                'warden_id': getattr(u, 'warden_id', '') or getattr(u, 'registration_number', ''),
                'email': u.email,
            }
        aw = obj.authorized_wardens.filter(authorization_status='ACTIVE').first()
        if aw:
            return {
                'id': aw.id,
                'name': aw.full_name or f"Warden {aw.warden_id}",
                'warden_id': aw.warden_id,
                'email': aw.email,
            }
        return None

    def get_max_floor(self, obj) -> int:
        from django.db.models import Max
        room_max = Room.objects.filter(block__hostel=obj, is_active=True).aggregate(m=Max('floor'))['m']
        block_max = obj.blocks.filter(is_active=True).aggregate(m=Max('floor_count'))['m']
        return max(room_max or 0, block_max or 0, 1)

    def get_floor_count(self, obj) -> int:
        return self.get_max_floor(obj)

    def get_available_floors(self, obj) -> list:
        floors = list(
            Room.objects.filter(block__hostel=obj, is_active=True)
            .values_list('floor', flat=True)
            .distinct()
            .order_by('floor')
        )
        if not floors:
            return list(range(1, self.get_max_floor(obj) + 1))
        return floors

    def get_total_beds(self, obj) -> int:
        return Bed.objects.filter(
            room__block__hostel=obj, is_active=True
        ).count()

    def get_occupied_beds(self, obj) -> int:
        return Allocation.objects.filter(
            bed__room__block__hostel=obj, is_active=True
        ).count()

    def get_vacant_beds(self, obj) -> int:
        total = self.get_total_beds(obj)
        occupied = self.get_occupied_beds(obj)
        return max(0, total - occupied)

    def get_total_rooms(self, obj) -> int:
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

    def get_bed_label(self, obj) -> str:
        return obj.bed.full_label

    def get_hostel_name(self, obj) -> str:
        return obj.bed.hostel.name

    def get_block_name(self, obj) -> str:
        return obj.bed.block.name

    def get_room_number(self, obj) -> str:
        return obj.bed.room.room_number
