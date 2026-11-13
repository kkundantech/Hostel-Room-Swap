"""
Module: backend/apps/matching/management/commands/activate_full_pipeline.py

Work / Purpose:
    Django management command (activate_full_pipeline) to run end-to-end matching pipeline initialization across sample data.

Connected Modules (Used By / Routes):
    - Standalone / discovered dynamically via Django app registry or runtime

Helpful / Supporting Modules (Dependencies):
    - backend/apps/accounts/models.py
    - backend/apps/approvals/services.py
    - backend/apps/audit/services.py
    - backend/apps/exchange_requests/models.py
    - backend/apps/hostels/models.py
    - backend/apps/matching/engine.py
    - backend/apps/proposals/models.py
    - backend/apps/proposals/services.py
    - backend/apps/transfers/models.py
    - django (external library / framework)
    - random (external library / framework)

Original Module Notes:
    Management command to activate and populate full platform lifecycle:
    - Exchange requests forming 2-way, 3-way, and multi-party cycles
    - Matching engine cycle detection execution
    - Acceptance responses across participants
    - Warden approval and Two-Phase Atomic Swap execution
    - Transfer records, letters, and audit trails
    - Analytics metrics and historical records
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from apps.accounts.models import User
from apps.hostels.models import Allocation, Bed, Room, Block, Hostel
from apps.exchange_requests.models import ExchangeRequest
from apps.matching.engine import build_compatibility_graph, find_cycles
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.proposals.services import create_proposal_from_cycle, process_participant_response
from apps.approvals.services import approve_proposal
from apps.transfers.models import TransferRecord
from apps.audit.services import log_audit_event


class Command(BaseCommand):
    help = 'Activates and executes full platform pipeline across all roles'

    def handle(self, *args, **options):
        self.stdout.write('--- Starting Platform Full Pipeline Activation ---')

        # 1. Fetch Students
        s1 = User.objects.get(email='student1@hostel.edu')
        s2 = User.objects.get(email='student2@hostel.edu')
        s3 = User.objects.get(email='student3@hostel.edu')
        s4 = User.objects.get(email='student4@hostel.edu')
        s5 = User.objects.get(email='student5@hostel.edu')
        s6 = User.objects.get(email='student6@hostel.edu')
        s7 = User.objects.get(email='student7@hostel.edu')
        s8 = User.objects.get(email='student8@hostel.edu')

        w_bh1 = User.objects.get(email='warden.bh1@hostel.edu')
        chief_warden = User.objects.get(email='chiefwarden@hostel.edu')
        admin_user = User.objects.get(email='admin@hostel.edu')

        # Ensure all students have active allocations
        for s in [s1, s2, s3, s4, s5, s6, s7, s8]:
            alloc = Allocation.objects.filter(student=s, is_active=True).first()
            if not alloc:
                # Find an unallocated bed
                occupied_beds = Allocation.objects.filter(is_active=True).values_list('bed_id', flat=True)
                free_bed = Bed.objects.filter(room__block__gender_restriction='MALE').exclude(id__in=occupied_beds).first()
                if free_bed:
                    Allocation.objects.create(student=s, bed=free_bed, is_active=True, reason='Activation Allocation')

        alloc_map = {s.id: Allocation.objects.get(student=s, is_active=True).bed for s in [s1, s2, s3, s4, s5, s6, s7, s8]}

        now = timezone.now()
        exp = now + timedelta(days=14)

        # Clear existing non-completed requests/proposals for clean pipeline state
        ExchangeProposal.objects.filter(status__in=['PENDING_ACCEPTANCE', 'PENDING_APPROVAL']).delete()
        ExchangeRequest.objects.filter(status='OPEN').delete()

        # =========================================================================
        # Group A: Direct 2-Way Swap (Student 1 <-> Student 2)
        # =========================================================================
        self.stdout.write('1. Creating Direct 2-Way Swap Requests (S1 <-> S2)...')
        r1, _ = ExchangeRequest.objects.get_or_create(
            student=s1,
            current_bed=alloc_map[s1.id],
            defaults={'preferred_bed': alloc_map[s2.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Prefer quieter room'}
        )
        r2, _ = ExchangeRequest.objects.get_or_create(
            student=s2,
            current_bed=alloc_map[s2.id],
            defaults={'preferred_bed': alloc_map[s1.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Closer to study hall'}
        )

        # =========================================================================
        # Group B: 3-Way Rotation Cycle (Student 3 -> Student 4 -> Student 5 -> Student 3)
        # =========================================================================
        self.stdout.write('2. Creating 3-Way Cycle Requests (S3 -> S4 -> S5 -> S3)...')
        r3, _ = ExchangeRequest.objects.get_or_create(
            student=s3,
            current_bed=alloc_map[s3.id],
            defaults={'preferred_bed': alloc_map[s4.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Near department friends'}
        )
        r4, _ = ExchangeRequest.objects.get_or_create(
            student=s4,
            current_bed=alloc_map[s4.id],
            defaults={'preferred_bed': alloc_map[s5.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Prefers ground floor block'}
        )
        r5, _ = ExchangeRequest.objects.get_or_create(
            student=s5,
            current_bed=alloc_map[s5.id],
            defaults={'preferred_bed': alloc_map[s3.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Roommate mutual compatibility'}
        )

        # =========================================================================
        # Group C: Open Pending Requests (Student 6, 7, 8)
        # =========================================================================
        self.stdout.write('3. Creating Open Requests (S6, S7, S8)...')
        r6, _ = ExchangeRequest.objects.get_or_create(
            student=s6,
            current_bed=alloc_map[s6.id],
            defaults={'preferred_bed': alloc_map[s7.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Morning sunlight room'}
        )
        r7, _ = ExchangeRequest.objects.get_or_create(
            student=s7,
            current_bed=alloc_map[s7.id],
            defaults={'preferred_bed': alloc_map[s8.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Need desk near window'}
        )
        r8, _ = ExchangeRequest.objects.get_or_create(
            student=s8,
            current_bed=alloc_map[s8.id],
            defaults={'preferred_bed': alloc_map[s6.id], 'status': 'OPEN', 'is_eligible': True, 'expires_at': exp, 'reason': 'Room exchange preference'}
        )

        # =========================================================================
        # 4. Run Matching Engine (Graph DFS Engine)
        # =========================================================================
        self.stdout.write('4. Running Matching Engine over Open Compatibility Graph...')
        open_requests = list(ExchangeRequest.objects.filter(status='OPEN', is_eligible=True))
        graph, req_map = build_compatibility_graph(open_requests)
        cycles = find_cycles(graph, req_map, max_length=5)

        self.stdout.write(self.style.SUCCESS(f'   -> Detected {len(cycles)} cycle(s)!'))

        created_proposals = []
        for c in cycles:
            prop = create_proposal_from_cycle(c)
            if prop:
                created_proposals.append(prop)
                self.stdout.write(f'   -> Created Proposal: {prop.reference_code} (Cycle Length {prop.cycle_length})')

        # =========================================================================
        # 5. Process Group A (2-Way Swap): Accept & Approve into COMPLETED state
        # =========================================================================
        prop_2way = None
        for p in created_proposals:
            if p.cycle_length == 2:
                prop_2way = p
                break

        if prop_2way:
            self.stdout.write(f'5. Simulating Acceptance on 2-Way Proposal {prop_2way.reference_code}...')
            for part in prop_2way.participants.all():
                process_participant_response(part, accepted=True, note='Ready for swap')

            prop_2way.refresh_from_db()
            self.stdout.write(f'   Proposal Status: {prop_2way.status}')

            self.stdout.write('6. Warden Approving Proposal & Executing Two-Phase Atomic Swap...')
            approve_proposal(prop_2way.id, w_bh1, remarks='Authorized under institutional exchange guidelines.')
            prop_2way.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(f'   -> Proposal {prop_2way.reference_code} status: {prop_2way.status} (EXECUTED)'))

        # =========================================================================
        # 6. Process Group B (3-Way Cycle): Accept into PENDING_APPROVAL
        # =========================================================================
        prop_3way = None
        for p in created_proposals:
            if p.cycle_length == 3 and p.status == 'PENDING_ACCEPTANCE':
                prop_3way = p
                break

        if prop_3way:
            self.stdout.write(f'7. Simulating All 3 Acceptances on {prop_3way.reference_code}...')
            for part in prop_3way.participants.all():
                process_participant_response(part, accepted=True, note='Accepted 3-way rotation')
            prop_3way.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(
                f'   -> Proposal {prop_3way.reference_code} is now {prop_3way.status} (In Warden Queue!)'
            ))

        # =========================================================================
        # 7. Add Historical Transfer Records for Analytics & Dean Reporting
        # =========================================================================
        self.stdout.write('8. Generating Historical Analytics & Audit Data...')
        h1 = Hostel.objects.filter(code='BH1').first()
        h2 = Hostel.objects.filter(code='GH1').first()

        # Generate some historical audit events
        log_audit_event(user=admin_user, action='POLICY_CONFIG_UPDATED', description='Updated maximum cycle length to 5')
        log_audit_event(user=chief_warden, action='HOSTEL_REVIEW_CONDUCTED', description='Monthly occupancy balance verification')

        self.stdout.write(self.style.SUCCESS('--- Platform Full Pipeline Activation Complete! ---'))
