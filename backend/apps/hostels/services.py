"""
Module: backend/apps/hostels/services.py

Work / Purpose:
    Centralized validation and management services for:
    1. Student Room and Bed Occupancy verification (preventing duplicate room/bed assignment,
       checking Seat A / Seat B availability, room capacity limits).
    2. Warden Hostel Jurisdiction verification (enforcing single-warden per hostel policy,
       preventing duplicate assignment, providing warnings).
    3. Student Room Deallocation (freeing up occupied seats so students can be removed
       and seats reassigned).
    4. Warden Hostel Unassignment (releasing hostel scopes so they can be reassigned).
"""

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.audit.services import log_audit_event


def get_user_model_safe():
    return get_user_model()


def validate_and_check_bed_occupancy(
    hostel_code: str,
    room_number: str,
    bed_number: str = '',
    exclude_student_id: int | str | None = None,
    exclude_email: str | None = None,
    exclude_reg_no: str | None = None,
) -> dict:
    """
    Check if a specific bed or room is already occupied.
    Returns:
        {
            'is_occupied': bool,
            'occupant': {'name': str, 'registration_number': str, 'email': str} | None,
            'message': str,
            'suggested_available_beds': list[str],
        }
    """
    from .models import Hostel, Room, Bed, Allocation
    from apps.accounts.models import AuthorizedStudent, AuthorizedIdentity

    if not hostel_code or not room_number:
        return {'is_occupied': False, 'occupant': None, 'message': '', 'suggested_available_beds': []}

    hostel_code_clean = str(hostel_code).strip().upper()
    room_num_clean = str(room_number).strip().upper()
    bed_num_clean = str(bed_number).strip().upper() if bed_number else ''

    User = get_user_model_safe()

    # 1. Check existing Room
    room = Room.objects.filter(
        block__hostel__code__iexact=hostel_code_clean,
        room_number__iexact=room_num_clean,
        is_active=True,
    ).prefetch_related('beds').first()

    available_beds = []
    if room:
        active_alloc_beds = set(
            Allocation.objects.filter(
                bed__room=room,
                is_active=True,
            ).values_list('bed__bed_number', flat=True)
        )
        pre_alloc_beds = set(
            AuthorizedStudent.objects.filter(
                initial_hostel_code__iexact=hostel_code_clean,
                initial_room__iexact=room_num_clean,
                authorization_status='ACTIVE',
            ).values_list('initial_bed', flat=True)
        )
        occupied_bed_labels = {b.upper() for b in (active_alloc_beds | pre_alloc_beds) if b}
        all_possible_beds = [b.bed_number.upper() for b in room.beds.filter(is_active=True)]
        if not all_possible_beds:
            all_possible_beds = ['A', 'B', 'C', 'D'][:room.capacity]
        available_beds = [b for b in all_possible_beds if b not in occupied_bed_labels]

    # Helper to check if a matched user or record matches the excluded student
    def is_excluded(u_email=None, u_reg=None, u_id=None):
        if exclude_student_id is not None:
            if str(u_id) == str(exclude_student_id) or str(u_reg).upper() == str(exclude_student_id).upper():
                return True
        if exclude_email and u_email:
            if u_email.strip().lower() == exclude_email.strip().lower():
                return True
        if exclude_reg_no and u_reg:
            if u_reg.strip().upper() == exclude_reg_no.strip().upper():
                return True
        return False

    # 2. Check Active Allocations
    active_alloc_qs = Allocation.objects.filter(
        bed__room__block__hostel__code__iexact=hostel_code_clean,
        bed__room__room_number__iexact=room_num_clean,
        is_active=True,
    ).select_related('student', 'bed')

    if bed_num_clean:
        active_alloc_qs = active_alloc_qs.filter(bed__bed_number__iexact=bed_num_clean)

    for alloc in active_alloc_qs:
        st = alloc.student
        if not is_excluded(st.email, getattr(st, 'registration_number', ''), st.id):
            name = st.get_full_name() or st.email
            reg = getattr(st, 'registration_number', '')
            bed_lbl = alloc.bed.bed_number.upper()
            avail_str = f" Seat {available_beds[0]} is currently vacant and can be assigned." if available_beds else " No other seats are vacant in this room."
            return {
                'is_occupied': True,
                'occupant': {
                    'name': name,
                    'registration_number': reg,
                    'email': st.email,
                    'bed': bed_lbl,
                },
                'message': (
                    f"Room {room_num_clean} Bed {bed_lbl} in {hostel_code_clean} is already occupied by {name} "
                    f"({reg or st.email}). Seat {bed_lbl} cannot be assigned.{avail_str}"
                ),
                'suggested_available_beds': available_beds,
            }

    # 3. Check Pre-authorized Student Roster (AuthorizedStudent)
    auth_s_qs = AuthorizedStudent.objects.filter(
        initial_hostel_code__iexact=hostel_code_clean,
        initial_room__iexact=room_num_clean,
        authorization_status='ACTIVE',
    )
    if bed_num_clean:
        auth_s_qs = auth_s_qs.filter(initial_bed__iexact=bed_num_clean)

    for auth_s in auth_s_qs:
        if not is_excluded(auth_s.email, auth_s.registration_number, auth_s.id):
            name = auth_s.full_name or f"Student {auth_s.registration_number}"
            reg = auth_s.registration_number
            bed_lbl = (auth_s.initial_bed or 'A').upper()
            avail_str = f" Seat {available_beds[0]} is currently vacant and can be assigned." if available_beds else " No other seats are vacant in this room."
            return {
                'is_occupied': True,
                'occupant': {
                    'name': name,
                    'registration_number': reg,
                    'email': auth_s.email,
                    'bed': bed_lbl,
                },
                'message': (
                    f"Room {room_num_clean} Bed {bed_lbl} in {hostel_code_clean} is already pre-assigned to {name} "
                    f"({reg}). Seat {bed_lbl} cannot be assigned.{avail_str}"
                ),
                'suggested_available_beds': available_beds,
            }

    # 4. Check Centralized AuthorizedIdentity
    auth_i_qs = AuthorizedIdentity.objects.filter(
        role=User.Role.STUDENT,
        initial_hostel_code__iexact=hostel_code_clean,
        initial_room__iexact=room_num_clean,
        authorization_status='ACTIVE',
    )
    if bed_num_clean:
        auth_i_qs = auth_i_qs.filter(initial_bed__iexact=bed_num_clean)

    for auth_i in auth_i_qs:
        if not is_excluded(auth_i.trusted_email, auth_i.institution_id, auth_i.id):
            name = auth_i.name
            reg = auth_i.institution_id
            bed_lbl = (auth_i.initial_bed or 'A').upper()
            avail_str = f" Seat {available_beds[0]} is currently vacant and can be assigned." if available_beds else " No other seats are vacant in this room."
            return {
                'is_occupied': True,
                'occupant': {
                    'name': name,
                    'registration_number': reg,
                    'email': auth_i.trusted_email,
                    'bed': bed_lbl,
                },
                'message': (
                    f"Room {room_num_clean} Bed {bed_lbl} in {hostel_code_clean} is already assigned to {name} "
                    f"({reg}). Seat {bed_lbl} cannot be assigned.{avail_str}"
                ),
                'suggested_available_beds': available_beds,
            }

    # 5. Room capacity check if bed_number is not explicitly specified
    if room and not bed_num_clean:
        total_occupants = (
            Allocation.objects.filter(bed__room=room, is_active=True).count()
        )
        if total_occupants >= room.capacity:
            return {
                'is_occupied': True,
                'occupant': None,
                'message': f"Room {room_num_clean} in {hostel_code_clean} is already at full capacity ({room.capacity}/{room.capacity}). No vacant seats available.",
                'suggested_available_beds': [],
            }

    return {
        'is_occupied': False,
        'occupant': None,
        'message': '',
        'suggested_available_beds': available_beds,
    }


def get_room_bed_occupancy_summary(hostel_code: str, room_number: str) -> dict:
    """
    Returns complete breakdown of a room's beds, current occupants, and vacancies.
    """
    from .models import Hostel, Room, Bed, Allocation
    from apps.accounts.models import AuthorizedStudent, AuthorizedIdentity

    hostel_code_clean = str(hostel_code).strip().upper()
    room_num_clean = str(room_number).strip().upper()

    hostel = Hostel.objects.filter(code__iexact=hostel_code_clean).first()
    if not hostel:
        return {
            'exists': False,
            'hostel_code': hostel_code_clean,
            'room_number': room_num_clean,
            'warning': f"Hostel with code '{hostel_code_clean}' not found.",
            'beds': [],
            'capacity': 0,
            'occupied_count': 0,
            'vacant_count': 0,
            'available_count': 0,
            'is_full': False,
        }

    room = Room.objects.filter(
        block__hostel=hostel,
        room_number__iexact=room_num_clean,
    ).prefetch_related('beds', 'block').first()

    if not room:
        # Default capacity 2
        capacity = 2
        default_beds = [
            {'bed_number': 'A', 'is_occupied': False, 'occupant': None},
            {'bed_number': 'B', 'is_occupied': False, 'occupant': None},
        ]
        return {
            'exists': False,
            'hostel_code': hostel.code,
            'hostel_name': hostel.name,
            'room_number': room_num_clean,
            'capacity': capacity,
            'occupied_count': 0,
            'vacant_count': capacity,
            'is_full': False,
            'beds': default_beds,
            'available_beds': ['A', 'B'],
        }

    bed_objs = list(room.beds.filter(is_active=True).order_by('bed_number'))
    if not bed_objs:
        labels = ['A', 'B', 'C', 'D'][:room.capacity]
        bed_objs = [type('MockBed', (), {'bed_number': lbl, 'id': None})() for lbl in labels]

    active_allocations = {
        a.bed.bed_number.upper(): a
        for a in Allocation.objects.filter(bed__room=room, is_active=True).select_related('student', 'bed')
    }

    pre_auth_students = {
        s.initial_bed.upper(): s
        for s in AuthorizedStudent.objects.filter(
            initial_hostel_code__iexact=hostel.code,
            initial_room__iexact=room.room_number,
            authorization_status='ACTIVE',
        ) if s.initial_bed
    }

    pre_auth_identities = {
        i.initial_bed.upper(): i
        for i in AuthorizedIdentity.objects.filter(
            role='STUDENT',
            initial_hostel_code__iexact=hostel.code,
            initial_room__iexact=room.room_number,
            authorization_status='ACTIVE',
        ) if i.initial_bed
    }

    bed_list = []
    available_beds = []
    occupied_count = 0

    for bed in bed_objs:
        bed_lbl = bed.bed_number.upper()
        occupant = None
        is_occupied = False

        if bed_lbl in active_allocations:
            alloc = active_allocations[bed_lbl]
            st = alloc.student
            occupant = {
                'name': st.get_full_name() or st.email,
                'registration_number': getattr(st, 'registration_number', ''),
                'email': st.email,
                'status': 'ACTIVE_ALLOCATION',
            }
            is_occupied = True
        elif bed_lbl in pre_auth_students:
            pas = pre_auth_students[bed_lbl]
            occupant = {
                'name': pas.full_name or f"Student {pas.registration_number}",
                'registration_number': pas.registration_number,
                'email': pas.email,
                'status': 'PRE_AUTHORIZED',
            }
            is_occupied = True
        elif bed_lbl in pre_auth_identities:
            pai = pre_auth_identities[bed_lbl]
            occupant = {
                'name': pai.name,
                'registration_number': pai.institution_id,
                'email': pai.trusted_email,
                'status': 'PRE_AUTHORIZED',
            }
            is_occupied = True

        if is_occupied:
            occupied_count += 1
        else:
            available_beds.append(bed_lbl)

        bed_list.append({
            'bed_number': bed_lbl,
            'is_occupied': is_occupied,
            'occupant': occupant,
        })

    is_full = occupied_count >= room.capacity

    return {
        'exists': True,
        'hostel_code': hostel.code,
        'hostel_name': hostel.name,
        'room_number': room.room_number,
        'floor': room.floor,
        'capacity': room.capacity,
        'occupied_count': occupied_count,
        'vacant_count': max(0, room.capacity - occupied_count),
        'available_count': max(0, room.capacity - occupied_count),
        'is_full': is_full,
        'beds': bed_list,
        'available_beds': available_beds,
    }


def validate_and_check_warden_assignment(
    hostel_code_or_id: str | int,
    exclude_warden_id: str | None = None,
    exclude_email: str | None = None,
    exclude_user_id: int | None = None,
) -> dict:
    """
    Enforce single-warden per hostel policy.
    Returns:
        {
            'is_assigned': bool,
            'hostel_code': str,
            'hostel_name': str,
            'warden': {'name': str, 'warden_id': str, 'email': str} | None,
            'message': str,
        }
    """
    from .models import Hostel
    from apps.accounts.models import WardenAssignment, AuthorizedWarden, AuthorizedIdentity

    if not hostel_code_or_id:
        return {'is_assigned': False, 'hostel_code': '', 'hostel_name': '', 'warden': None, 'message': ''}

    # Resolve hostel
    hostel = None
    if str(hostel_code_or_id).isdigit():
        hostel = Hostel.objects.filter(id=int(hostel_code_or_id)).first()
    if not hostel:
        hostel = Hostel.objects.filter(code__iexact=str(hostel_code_or_id).strip()).first()
    if not hostel:
        return {'is_assigned': False, 'hostel_code': str(hostel_code_or_id), 'hostel_name': '', 'warden': None, 'message': ''}

    def is_excluded(w_email=None, w_wid=None, w_uid=None):
        if exclude_user_id is not None and w_uid is not None:
            if str(exclude_user_id) == str(w_uid):
                return True
        if exclude_email and w_email:
            if w_email.strip().lower() == exclude_email.strip().lower():
                return True
        if exclude_warden_id and w_wid:
            if w_wid.strip().upper() == str(exclude_warden_id).strip().upper():
                return True
        return False

    # 1. Check active WardenAssignment
    assignments = WardenAssignment.objects.filter(
        hostel=hostel,
        is_active=True,
    ).select_related('warden')

    for assign in assignments:
        u = assign.warden
        u_wid = getattr(u, 'warden_id', '') or getattr(u, 'registration_number', '')
        if not is_excluded(u.email, u_wid, u.id):
            name = u.get_full_name() or u.email
            wid = u_wid or u.email
            return {
                'is_assigned': True,
                'hostel_code': hostel.code,
                'hostel_name': hostel.name,
                'warden': {
                    'name': name,
                    'warden_id': wid,
                    'email': u.email,
                },
                'message': (
                    f"Hostel {hostel.code} ({hostel.name}) is already assigned to Warden {name} ({wid}). "
                    f"Each hostel can only have one active assigned warden. "
                    f"To reassign this hostel, please remove the existing warden first."
                ),
            }

    # 2. Check AuthorizedWarden roster
    auth_wardens = AuthorizedWarden.objects.filter(
        assigned_hostels=hostel,
        authorization_status='ACTIVE',
    )
    for aw in auth_wardens:
        if not is_excluded(aw.email, aw.warden_id, aw.id):
            name = aw.full_name or f"Warden {aw.warden_id}"
            return {
                'is_assigned': True,
                'hostel_code': hostel.code,
                'hostel_name': hostel.name,
                'warden': {
                    'name': name,
                    'warden_id': aw.warden_id,
                    'email': aw.email,
                },
                'message': (
                    f"Hostel {hostel.code} ({hostel.name}) is already assigned to Warden {name} ({aw.warden_id}). "
                    f"Each hostel can only have one active assigned warden. "
                    f"To reassign this hostel, please remove the existing warden first."
                ),
            }

    # 3. Check AuthorizedIdentity roster
    auth_identities = AuthorizedIdentity.objects.filter(
        role__in=['WARDEN', 'CHIEF_WARDEN'],
        authorization_status='ACTIVE',
    )
    for ai in auth_identities:
        if is_excluded(ai.trusted_email, ai.institution_id, ai.id):
            continue
        hostel_ids_or_codes = [str(x).upper() for x in (ai.assigned_hostel_ids or [])]
        if hostel.code.upper() in hostel_ids_or_codes or str(hostel.id) in hostel_ids_or_codes:
            return {
                'is_assigned': True,
                'hostel_code': hostel.code,
                'hostel_name': hostel.name,
                'warden': {
                    'name': ai.name,
                    'warden_id': ai.institution_id,
                    'email': ai.trusted_email,
                },
                'message': (
                    f"Hostel {hostel.code} ({hostel.name}) is already assigned to Warden {ai.name} ({ai.institution_id}). "
                    f"Each hostel can only have one active assigned warden. "
                    f"To reassign this hostel, please remove the existing warden first."
                ),
            }

    return {
        'is_assigned': False,
        'hostel_code': hostel.code,
        'hostel_name': hostel.name,
        'warden': None,
        'message': '',
    }


def deallocate_student_room(
    identifier: str | int,
    reason: str = 'Deallocated by administrator',
    user_performing=None,
    request=None,
) -> dict:
    """
    Deallocate a student from their currently assigned room and bed.
    Frees up the seat immediately.
    """
    from .models import Allocation
    from apps.accounts.models import AuthorizedStudent, AuthorizedIdentity

    User = get_user_model_safe()
    clean_id = str(identifier).strip()

    with transaction.atomic():
        # Match user
        user = (
            User.objects.filter(id=int(clean_id)).first()
            if clean_id.isdigit()
            else None
        )
        if not user:
            user = (
                User.objects.filter(email__iexact=clean_id).first()
                or User.objects.filter(registration_number__iexact=clean_id).first()
                or User.objects.filter(student_profile__roll_number__iexact=clean_id).first()
            )
        if not user:
            auth_s_lookup = AuthorizedStudent.objects.filter(
                Q(registration_number__iexact=clean_id) | Q(email__iexact=clean_id)
            ).first()
            if auth_s_lookup and auth_s_lookup.email:
                user = User.objects.filter(email__iexact=auth_s_lookup.email).first()
        if not user:
            auth_i_lookup = AuthorizedIdentity.objects.filter(
                Q(institution_id__iexact=clean_id) | Q(trusted_email__iexact=clean_id)
            ).first()
            if auth_i_lookup and auth_i_lookup.trusted_email:
                user = User.objects.filter(email__iexact=auth_i_lookup.trusted_email).first()

        freed_details = []

        if user:
            active_allocs = Allocation.objects.filter(student=user, is_active=True).select_related('bed__room__block__hostel')
            for a in active_allocs:
                freed_details.append(a.bed.full_label)
                a.is_active = False
                a.deallocated_at = timezone.now()
                a.reason = reason
                a.save(update_fields=['is_active', 'deallocated_at', 'reason', 'updated_at'])

        # Update AuthorizedStudent roster
        auth_s = AuthorizedStudent.objects.filter(
            Q(registration_number__iexact=clean_id) | Q(email__iexact=clean_id)
        ).first()
        if auth_s:
            if auth_s.initial_hostel_code and not freed_details:
                freed_details.append(f"{auth_s.initial_hostel_code}-{auth_s.initial_room}/Bed-{auth_s.initial_bed}")
            auth_s.initial_hostel_code = ''
            auth_s.initial_room = ''
            auth_s.initial_bed = ''
            auth_s.save(update_fields=['initial_hostel_code', 'initial_room', 'initial_bed', 'updated_at'])

        # Update AuthorizedIdentity
        auth_i = AuthorizedIdentity.objects.filter(
            Q(institution_id__iexact=clean_id) | Q(trusted_email__iexact=clean_id)
        ).first()
        if auth_i:
            if auth_i.initial_hostel_code and not freed_details:
                freed_details.append(f"{auth_i.initial_hostel_code}-{auth_i.initial_room}/Bed-{auth_i.initial_bed}")
            auth_i.initial_hostel_code = ''
            auth_i.initial_room = ''
            auth_i.initial_bed = ''
            auth_i.save(update_fields=['initial_hostel_code', 'initial_room', 'initial_bed', 'updated_at'])

        label_str = ", ".join(freed_details) if freed_details else "their room"
        actor_name = user_performing.email if user_performing else 'Administrator'

        if user_performing:
            log_audit_event(
                user=user_performing,
                action='ROOM_DEALLOCATED',
                description=f"Student {clean_id} deallocated from {label_str} by {actor_name}. Seat is now vacant.",
                target_type='Allocation',
                request=request,
            )

        return {
            'success': True,
            'freed_bed': label_str,
            'detail': f"Student {clean_id} successfully deallocated from {label_str}. Seat is now vacant and available for allocation.",
        }


def unassign_warden_from_hostel(
    warden_identifier: str | int,
    hostel_code_or_id: str | int,
    user_performing=None,
    request=None,
) -> dict:
    """
    Unassign a specific hostel from a warden.
    Releases the hostel so it can be assigned to another warden.
    """
    from .models import Hostel
    from apps.accounts.models import WardenAssignment, AuthorizedWarden, AuthorizedIdentity

    User = get_user_model_safe()
    clean_wid = str(warden_identifier).strip()

    # Find hostel
    hostel = None
    if str(hostel_code_or_id).isdigit():
        hostel = Hostel.objects.filter(id=int(hostel_code_or_id)).first()
    if not hostel:
        hostel = Hostel.objects.filter(code__iexact=str(hostel_code_or_id).strip()).first()
    if not hostel:
        return {'success': False, 'detail': f"Hostel '{hostel_code_or_id}' not found."}

    with transaction.atomic():
        # Match user
        user = (
            User.objects.filter(id=int(clean_wid)).first()
            if clean_wid.isdigit()
            else None
        )
        if not user:
            user = (
                User.objects.filter(email__iexact=clean_wid).first()
                or User.objects.filter(warden_id__iexact=clean_wid).first()
                or User.objects.filter(registration_number__iexact=clean_wid).first()
            )

        if user:
            WardenAssignment.objects.filter(warden=user, hostel=hostel).delete()

        # Update AuthorizedWarden
        auth_w = AuthorizedWarden.objects.filter(
            Q(warden_id__iexact=clean_wid) | Q(email__iexact=clean_wid)
        ).first()
        if auth_w:
            auth_w.assigned_hostels.remove(hostel)

        # Update AuthorizedIdentity
        auth_i = AuthorizedIdentity.objects.filter(
            Q(institution_id__iexact=clean_wid) | Q(trusted_email__iexact=clean_wid)
        ).first()
        if auth_i:
            current_ids = auth_i.assigned_hostel_ids or []
            new_ids = [
                h for h in current_ids
                if str(h).upper() != hostel.code.upper() and str(h) != str(hostel.id)
            ]
            auth_i.assigned_hostel_ids = new_ids
            auth_i.save(update_fields=['assigned_hostel_ids', 'updated_at'])

        actor_name = user_performing.email if user_performing else 'Administrator'
        if user_performing:
            log_audit_event(
                user=user_performing,
                action='WARDEN_HOSTEL_UNASSIGNED',
                description=f"Hostel {hostel.code} unassigned from Warden {clean_wid} by {actor_name}. Hostel is now available.",
                target_type='Hostel',
                target_id=hostel.id,
                request=request,
            )

        return {
            'success': True,
            'hostel_code': hostel.code,
            'detail': f"Hostel {hostel.code} ({hostel.name}) successfully removed from Warden {clean_wid}. It is now free for reassignment.",
        }
