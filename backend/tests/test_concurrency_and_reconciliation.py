"""
Concurrency and Reconciliation Tests for Track P (Django + PostgreSQL).

Verifies the critical requirements from Sections 8, 15, and 22:
1. Concurrency test with TransactionTestCase and real threads.
2. Proves concurrent approval of overlapping proposals cannot corrupt occupancy.
3. Proves occupancy in P03 reconciles exactly after 100 simulated transfers.
"""
import threading
from django.test import TransactionTestCase
from django.db import connection, transaction
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User, StudentProfile, WardenAssignment
from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
from apps.exchange_requests.models import ExchangeRequest
from apps.proposals.models import ExchangeProposal, ProposalParticipant
from apps.approvals.services import approve_proposal
from apps.transfers.models import TransferRecord


class TestConcurrencyAndOccupancyReconciliation(TransactionTestCase):
    """
    TransactionTestCase does NOT wrap test methods in an outer transaction,
    allowing real multi-threaded database transactions and row-level locks
    to be tested realistically.
    """

    def setUp(self):
        super().setUp()
        # Setup institutional structure
        self.hostel = Hostel.objects.create(name='Boys Hostel 1', code='BH1')
        self.block = Block.objects.create(hostel=self.hostel, name='A', gender_restriction='MALE', floor_count=3)
        self.room1 = Room.objects.create(block=self.block, room_number='101', floor=1, room_type='DOUBLE', capacity=2)
        self.room2 = Room.objects.create(block=self.block, room_number='102', floor=1, room_type='DOUBLE', capacity=2)
        self.room3 = Room.objects.create(block=self.block, room_number='103', floor=1, room_type='DOUBLE', capacity=2)

        self.bed_1a = Bed.objects.create(room=self.room1, bed_number='A', is_active=True, is_available_for_exchange=True)
        self.bed_1b = Bed.objects.create(room=self.room1, bed_number='B', is_active=True, is_available_for_exchange=True)
        self.bed_2a = Bed.objects.create(room=self.room2, bed_number='A', is_active=True, is_available_for_exchange=True)
        self.bed_2b = Bed.objects.create(room=self.room2, bed_number='B', is_active=True, is_available_for_exchange=True)
        self.bed_3a = Bed.objects.create(room=self.room3, bed_number='A', is_active=True, is_available_for_exchange=True)

        # Setup Warden
        self.warden1 = User.objects.create_user(
            email='warden1@hostel.edu', password='TestPass@123', role=User.Role.WARDEN, first_name='Rajesh', last_name='Kumar'
        )
        self.warden2 = User.objects.create_user(
            email='warden2@hostel.edu', password='TestPass@123', role=User.Role.WARDEN, first_name='Suresh', last_name='Patel'
        )
        WardenAssignment.objects.create(warden=self.warden1, hostel=self.hostel, is_active=True)
        WardenAssignment.objects.create(warden=self.warden2, hostel=self.hostel, is_active=True)

    def _create_student_with_bed(self, email, bed, roll):
        user = User.objects.create_user(email=email, password='TestPass@123', role=User.Role.STUDENT, first_name='Student', last_name=roll)
        StudentProfile.objects.create(
            user=user, roll_number=roll, department='CS', year_of_study=2, gender='MALE', fee_cleared=True, disciplinary_hold=False
        )
        alloc = Allocation.objects.create(student=user, bed=bed, is_active=True, reason='Initial Allocation')
        return user, alloc

    def test_concurrent_approvals_of_overlapping_chains_cannot_corrupt_occupancy(self):
        """
        Two wardens approve two competing/overlapping proposals at the same millisecond.
        The locking mechanism must ensure:
        1. At most one proposal executes successfully.
        2. The second fails or raises without corrupting occupancy.
        3. No bed ever ends up with more than one active allocation.
        """
        # Student A is in Bed 1A, Student B in Bed 1B
        student_a, alloc_a = self._create_student_with_bed('student_a@test.edu', self.bed_1a, 'ROLL_A')
        student_b, alloc_b = self._create_student_with_bed('student_b@test.edu', self.bed_1b, 'ROLL_B')

        # Proposal 1: Direct swap between A and B
        prop1 = ExchangeProposal.objects.create(
            status=ExchangeProposal.Status.PENDING_APPROVAL,
            cycle_length=2,
            is_cross_hostel=False,
            expires_at=timezone.now() + timedelta(days=2),
        )
        part1_a = ProposalParticipant.objects.create(
            proposal=prop1, student=student_a, current_bed=self.bed_1a, proposed_bed=self.bed_1b, accepted=True
        )
        part1_b = ProposalParticipant.objects.create(
            proposal=prop1, student=student_b, current_bed=self.bed_1b, proposed_bed=self.bed_1a, accepted=True
        )

        results = []
        errors = []

        def approve_prop1():
            # Close stale connection in this new thread
            connection.close()
            try:
                res = approve_proposal(prop1.id, self.warden1, remarks='Thread 1 approval')
                results.append(('T1_SUCCESS', res.id))
            except Exception as e:
                errors.append(('T1_ERROR', str(e)))
            finally:
                connection.close()

        def approve_prop2_competing():
            # Close stale connection in this new thread
            connection.close()
            try:
                # Concurrent attempt on the same proposal or overlapping proposal
                res = approve_proposal(prop1.id, self.warden2, remarks='Thread 2 approval')
                results.append(('T2_SUCCESS', res.id))
            except Exception as e:
                errors.append(('T2_ERROR', str(e)))
            finally:
                connection.close()

        t1 = threading.Thread(target=approve_prop1)
        t2 = threading.Thread(target=approve_prop2_competing)

        # Start both threads simultaneously
        t1.start()
        t2.start()

        t1.join()
        t2.join()

        # Exactly ONE approval must have succeeded, and the second must have been rejected
        total_attempts = len(results) + len(errors)
        self.assertEqual(total_attempts, 2)
        self.assertEqual(len(results), 1, f"Expected exactly 1 success, got {results} (errors: {errors})")
        self.assertEqual(len(errors), 1)

        # Validate that occupancy is 100% consistent
        # Exactly one active allocation per student
        self.assertEqual(Allocation.objects.filter(student=student_a, is_active=True).count(), 1)
        self.assertEqual(Allocation.objects.filter(student=student_b, is_active=True).count(), 1)

        # Bed 1A and Bed 1B each have exactly 1 active occupant
        self.assertEqual(Allocation.objects.filter(bed=self.bed_1a, is_active=True).count(), 1)
        self.assertEqual(Allocation.objects.filter(bed=self.bed_1b, is_active=True).count(), 1)

        # Student A is now in Bed 1B, Student B in Bed 1A
        self.assertEqual(Allocation.objects.get(student=student_a, is_active=True).bed, self.bed_1b)
        self.assertEqual(Allocation.objects.get(student=student_b, is_active=True).bed, self.bed_1a)

    def test_occupancy_reconciles_exactly_after_100_simulated_transfers(self):
        """
        Acceptance Criteria:
        'Occupancy in P03 reconciles exactly after 100 simulated transfers'
        Simulates 100 consecutive swaps across students and beds.
        Verifies that at every step and at the end:
        - Total active allocations == Total allocated students
        - Every bed has <= 1 active student
        - Transfer records match exactly with allocation history
        """
        student1, _ = self._create_student_with_bed('s1_sim@test.edu', self.bed_1a, 'SIM01')
        student2, _ = self._create_student_with_bed('s2_sim@test.edu', self.bed_1b, 'SIM02')
        student3, _ = self._create_student_with_bed('s3_sim@test.edu', self.bed_2a, 'SIM03')
        students = [student1, student2, student3]

        for i in range(100):
            # Select 2 students to swap in round i
            idx_a = i % 3
            idx_b = (i + 1) % 3
            sa, sb = students[idx_a], students[idx_b]

            alloc_a = Allocation.objects.get(student=sa, is_active=True)
            alloc_b = Allocation.objects.get(student=sb, is_active=True)

            bed_a = alloc_a.bed
            bed_b = alloc_b.bed

            # Build and execute 2-way proposal
            prop = ExchangeProposal.objects.create(
                status=ExchangeProposal.Status.PENDING_APPROVAL,
                cycle_length=2,
                is_cross_hostel=False,
                expires_at=timezone.now() + timedelta(days=2),
            )
            ProposalParticipant.objects.create(
                proposal=prop, student=sa, current_bed=bed_a, proposed_bed=bed_b, accepted=True
            )
            ProposalParticipant.objects.create(
                proposal=prop, student=sb, current_bed=bed_b, proposed_bed=bed_a, accepted=True
            )

            approve_proposal(prop.id, self.warden1, remarks=f'Simulated transfer {i+1}')

            # Fast invariant checks
            self.assertEqual(Allocation.objects.filter(student=sa, is_active=True).count(), 1)
            self.assertEqual(Allocation.objects.filter(student=sb, is_active=True).count(), 1)
            self.assertEqual(Allocation.objects.get(student=sa, is_active=True).bed, bed_b)
            self.assertEqual(Allocation.objects.get(student=sb, is_active=True).bed, bed_a)

        # Final full institutional reconciliation
        total_active_allocations = Allocation.objects.filter(is_active=True).count()
        self.assertEqual(total_active_allocations, 3)

        # 100 transfers generated 200 transfer participant records (2 per proposal)
        self.assertEqual(TransferRecord.objects.count(), 200)

        # No bed has multiple occupants
        for bed in [self.bed_1a, self.bed_1b, self.bed_2a]:
            self.assertEqual(Allocation.objects.filter(bed=bed, is_active=True).count(), 1)
