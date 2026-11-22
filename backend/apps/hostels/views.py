"""
Module: backend/apps/hostels/views.py

Work / Purpose:
    Provides HostelViewSet, BlockViewSet, RoomViewSet, BedViewSet, and OccupancyViewSet with gender/warden-scope isolation.

Connected Modules (Used By / Routes):
    - backend/apps/exchange_requests/serializers.py
    - backend/apps/exchange_requests/views.py
    - backend/apps/hostels/urls.py

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/permissions.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/hostels/models.py
    - backend/apps/hostels/serializers.py
    - backend/apps/proposals/models.py
    - django_filters (external library / framework)
    - rest_framework (external library / framework)

Original Module Notes:
    Views for hostel, block, room, bed, and allocation endpoints.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Hostel, Block, Room, Bed, Allocation
from .serializers import (
    HostelSerializer, HostelMinimalSerializer,
    BlockSerializer, RoomSerializer,
    BedSerializer, AllocationSerializer,
)
from apps.accounts.permissions import IsStudent, IsStaffRole, IsHostelAdmin, IsSuperAdmin


def get_user_allowed_hostel_categories(user):
    """
    Return list of hostel categories this user is authorized to access on the backend.
    Enforces university policy:
    - Boys' hostel eligible students only see BOYS (and COED if any).
    - Girls' hostel eligible students only see GIRLS (and COED if any).
    - Wardens see only categories for their assigned hostels.
    - Chief Warden, Admin, Dean have institutional scope.
    """
    if not user.is_authenticated:
        return []
    if user.role == 'STUDENT':
        eligibility = getattr(user, 'eligibility_classification', '')
        if eligibility == 'GIRLS':
            return ['GIRLS', 'COED']
        elif eligibility == 'BOYS':
            return ['BOYS', 'COED']
        # Fall back to student profile gender
        try:
            gender = user.student_profile.gender
            if gender == 'FEMALE':
                return ['GIRLS', 'COED']
            return ['BOYS', 'COED']
        except Exception:
            return ['BOYS']

    elif user.role == 'WARDEN':
        assigned_hostels = Hostel.objects.filter(
            warden_assignments__warden=user,
            warden_assignments__is_active=True,
        )
        return list(assigned_hostels.values_list('hostel_category', flat=True).distinct())

    return ['BOYS', 'GIRLS', 'COED']


class HostelViewSet(viewsets.ModelViewSet):
    """
    CRUD for hostels.
    - Server enforces: Students only retrieve/list hostels matching their verified eligibility.
    - Wardens only see their assigned hostels.
    - Any attempt to retrieve an unauthorized hostel ID results in 404 (IDOR prevention).
    - Only Hostel Admin can create/update/delete.
    """
    serializer_class = HostelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'hostel_category']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']

    def get_queryset(self):
        user = self.request.user
        qs = Hostel.objects.prefetch_related('blocks__rooms').all()

        if not user.is_authenticated:
            return qs.none()

        if user.role == 'STUDENT':
            allowed_cats = get_user_allowed_hostel_categories(user)
            return qs.filter(hostel_category__in=allowed_cats, is_active=True)

        elif user.role == 'WARDEN':
            assigned_ids = user.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
            return qs.filter(id__in=assigned_ids, is_active=True)

        # Chief Warden, Hostel Admin, Dean
        return qs.filter(is_active=True) if not user.role == 'HOSTEL_ADMIN' else qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsHostelAdmin()]

    def get_serializer_class(self):
        if self.action == 'list':
            return HostelMinimalSerializer
        return HostelSerializer

    def perform_create(self, serializer):
        hostel = serializer.save()
        if not hostel.blocks.exists():
            Block.objects.create(
                hostel=hostel,
                name='A',
                floor_count=4,
                gender_restriction='MALE' if hostel.hostel_category == 'BOYS' else ('FEMALE' if hostel.hostel_category == 'GIRLS' else 'ANY')
            )


class BlockViewSet(viewsets.ModelViewSet):
    """Block management within hostels with server-side gender isolation."""
    serializer_class = BlockSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['hostel', 'gender_restriction', 'is_active']
    search_fields = ['name', 'hostel__name']

    def get_queryset(self):
        user = self.request.user
        qs = Block.objects.select_related('hostel').prefetch_related('rooms').all()

        if not user.is_authenticated:
            return qs.none()

        if user.role == 'STUDENT':
            allowed_cats = get_user_allowed_hostel_categories(user)
            student_gender = getattr(getattr(user, 'student_profile', None), 'gender', 'MALE')
            return qs.filter(
                hostel__hostel_category__in=allowed_cats,
                gender_restriction__in=[student_gender, 'ANY'],
                is_active=True,
            )
        elif user.role == 'WARDEN':
            assigned_ids = user.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
            return qs.filter(hostel_id__in=assigned_ids)

        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsHostelAdmin()]


class RoomViewSet(viewsets.ModelViewSet):
    """Room management with server-side gender and hostel scope enforcement."""
    serializer_class = RoomSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['block', 'block__hostel', 'room_type', 'is_active', 'floor']
    search_fields = ['room_number', 'block__name', 'block__hostel__name']

    def get_queryset(self):
        user = self.request.user
        qs = Room.objects.select_related('block__hostel').prefetch_related('beds').all()

        if not user.is_authenticated:
            return qs.none()

        if user.role == 'STUDENT':
            allowed_cats = get_user_allowed_hostel_categories(user)
            student_gender = getattr(getattr(user, 'student_profile', None), 'gender', 'MALE')
            return qs.filter(
                block__hostel__hostel_category__in=allowed_cats,
                block__gender_restriction__in=[student_gender, 'ANY'],
                is_active=True,
            )
        elif user.role == 'WARDEN':
            assigned_ids = user.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
            return qs.filter(block__hostel_id__in=assigned_ids)

        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        if self.action in ('update', 'partial_update'):
            from apps.accounts.permissions import IsAdminOrWarden
            return [IsAdminOrWarden()]
        if self.action == 'reset_inventory':
            return [IsSuperAdmin()]
        return [IsHostelAdmin()]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'block' not in data and 'hostel_id' in data:
            hostel = Hostel.objects.filter(id=data['hostel_id']).first()
            if hostel:
                block = hostel.blocks.first()
                if not block:
                    block = Block.objects.create(
                        hostel=hostel,
                        name='A',
                        floor_count=4,
                        gender_restriction='MALE' if hostel.hostel_category == 'BOYS' else ('FEMALE' if hostel.hostel_category == 'GIRLS' else 'ANY')
                    )
                data['block'] = block.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()

        # Automatically create beds for the room according to capacity if none exist
        if not room.beds.exists():
            bed_labels = ['A', 'B', 'C', 'D', 'E', 'F'][:room.capacity]
            for label in bed_labels:
                Bed.objects.create(room=room, bed_number=label, is_active=True)

        headers = self.get_success_headers(serializer.data)
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def reset_inventory(self, request):
        """
        Wipe all rooms, beds, allocations, and requests so the system starts at 0 rooms.
        STRICT SECURITY CONTROLS:
        - Accessible ONLY by Super Administrator.
        - Requires explicit confirmation payload {"confirm": "WIPE_ALL_ROOM_INVENTORY"}.
        - Atomic and recorded in immutable audit log.
        """
        if request.data.get('confirm') != 'WIPE_ALL_ROOM_INVENTORY':
            return Response({
                'detail': 'Destructive operation rejected: You must provide {"confirm": "WIPE_ALL_ROOM_INVENTORY"} to execute this action.'
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        from apps.proposals.models import ExchangeProposal, ProposalParticipant
        from apps.exchange_requests.models import ExchangeRequest
        from apps.audit.services import log_audit_event

        with transaction.atomic():
            ProposalParticipant.objects.all().delete()
            ExchangeProposal.objects.all().delete()
            ExchangeRequest.objects.all().delete()
            Allocation.objects.all().delete()
            Bed.objects.all().delete()
            Room.objects.all().delete()

            log_audit_event(
                user=request.user,
                action='INVENTORY_RESET',
                description=f'Full room inventory and allocation wipe executed by Super Admin {request.user.email}',
                request=request,
            )

        return Response({
            'status': 'SUCCESS',
            'message': 'All rooms and allocations have been cleared. Room inventory is now at 0.',
            'total_rooms': 0,
            'total_beds': 0,
        }, status=status.HTTP_200_OK)


class BedViewSet(viewsets.ModelViewSet):
    """Bed management with server-side gender and scope enforcement."""
    serializer_class = BedSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['room', 'room__block', 'room__block__hostel', 'is_active']

    def get_queryset(self):
        user = self.request.user
        qs = Bed.objects.select_related('room__block__hostel').all()

        if not user.is_authenticated:
            return qs.none()

        if user.role == 'STUDENT':
            allowed_cats = get_user_allowed_hostel_categories(user)
            student_gender = getattr(getattr(user, 'student_profile', None), 'gender', 'MALE')
            return qs.filter(
                room__block__hostel__hostel_category__in=allowed_cats,
                room__block__gender_restriction__in=[student_gender, 'ANY'],
                is_active=True,
            )
        elif user.role == 'WARDEN':
            assigned_ids = user.warden_assignments.filter(is_active=True).values_list('hostel_id', flat=True)
            return qs.filter(room__block__hostel_id__in=assigned_ids)

        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'vacant_beds'):
            return [permissions.IsAuthenticated()]
        return [IsHostelAdmin()]

    @action(detail=False, methods=['get'], url_path='vacant')
    def vacant_beds(self, request):
        """Return all vacant active beds accessible to the requesting user."""
        qs = self.get_queryset().filter(
            is_active=True,
            is_available_for_exchange=True,
        ).exclude(
            allocations__is_active=True
        ).select_related('room__block__hostel')

        hostel_id = request.query_params.get('hostel')
        if hostel_id:
            qs = qs.filter(room__block__hostel_id=hostel_id)

        data = []
        for bed in qs:
            data.append({
                'id': bed.id,
                'bed_number': bed.bed_number,
                'room_id': bed.room.id,
                'room_number': bed.room.room_number,
                'floor': bed.room.floor,
                'room_type': bed.room.room_type,
                'room_type_display': bed.room.get_room_type_display(),
                'block_name': bed.room.block.name,
                'hostel_id': bed.room.block.hostel.id,
                'hostel_name': bed.room.block.hostel.name,
                'hostel_code': bed.room.block.hostel.code,
                'full_label': f"{bed.room.block.hostel.code}/{bed.room.block.name}/{bed.room.room_number}/Bed-{bed.bed_number}",
            })
        return Response(data)


class OccupancyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only occupancy view.
    - Students see own allocation only.
    - Wardens see allocations strictly in assigned hostels.
    - Chief Warden and Admins see all.
    """
    serializer_class = AllocationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'bed__room__block__hostel']

    def get_queryset(self):
        user = self.request.user
        qs = Allocation.objects.select_related(
            'student', 'bed__room__block__hostel'
        )
        if not user.is_authenticated:
            return qs.none()

        if user.role == 'STUDENT':
            return qs.filter(student=user)
        elif user.role == 'WARDEN':
            assigned_hostel_ids = user.warden_assignments.filter(
                is_active=True
            ).values_list('hostel_id', flat=True)
            return qs.filter(bed__room__block__hostel_id__in=assigned_hostel_ids)

        return qs.all()

    @action(detail=False, methods=['get'], url_path='my-allocation')
    def my_allocation(self, request):
        """Get the current user's active allocation."""
        allocation = Allocation.objects.filter(
            student=request.user, is_active=True
        ).select_related('bed__room__block__hostel').first()

        if not allocation:
            return Response(
                {'detail': 'No active allocation found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AllocationSerializer(allocation).data)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Alias for my-allocation."""
        return self.my_allocation(request)
