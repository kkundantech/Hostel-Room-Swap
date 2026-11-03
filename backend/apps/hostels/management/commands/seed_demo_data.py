"""
Seed data management command.
Creates demo accounts, hostels, rooms, beds, and allocations for development.
Run with: python manage.py seed_demo_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed demo data for development. DO NOT run in production.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing demo data before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            '[!] DEMO MODE: Seeding development data. Do not use in production.'
        ))

        with transaction.atomic():
            if options['clear']:
                self._clear_data()
            self._create_hostels()
            self._create_users()
            self._create_policies()

        self.stdout.write(self.style.SUCCESS('[SUCCESS] Demo data seeded successfully!'))
        self._print_credentials()

    def _clear_data(self):
        from apps.exchange_requests.models import ExchangeRequest
        from apps.proposals.models import ExchangeProposal
        from apps.transfers.models import TransferRecord
        from apps.hostels.models import Allocation, Bed, Room, Block, Hostel
        from apps.accounts.models import User, StudentProfile, WardenAssignment

        self.stdout.write('Clearing existing data...')
        TransferRecord.objects.all().delete()
        ExchangeProposal.objects.all().delete()
        ExchangeRequest.objects.all().delete()
        Allocation.objects.all().delete()
        Bed.objects.all().delete()
        Room.objects.all().delete()
        Block.objects.all().delete()
        Hostel.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def _create_hostels(self):
        from apps.hostels.models import Hostel, Block, Room, Bed, Allocation
        from apps.accounts.models import User

        self.stdout.write('Creating hostels...')

        # Hostel 1 (Boys)
        h1, _ = Hostel.objects.get_or_create(
            code='BH1',
            defaults={
                'name': 'Boys Hostel 1',
                'address': 'North Campus',
                'total_blocks': 2,
                'hostel_category': 'BOYS',
            },
        )
        h1.hostel_category = 'BOYS'
        h1.save(update_fields=['hostel_category'])

        block_a, _ = Block.objects.get_or_create(
            hostel=h1, name='A',
            defaults={'gender_restriction': 'MALE', 'floor_count': 3},
        )

        block_b, _ = Block.objects.get_or_create(
            hostel=h1, name='B',
            defaults={'gender_restriction': 'MALE', 'floor_count': 3},
        )

        # Hostel 2 (Girls)
        h2, _ = Hostel.objects.get_or_create(
            code='GH1',
            defaults={
                'name': 'Girls Hostel 1',
                'address': 'South Campus',
                'total_blocks': 2,
                'hostel_category': 'GIRLS',
            },
        )
        h2.hostel_category = 'GIRLS'
        h2.save(update_fields=['hostel_category'])

        block_c = Block.objects.get_or_create(
            hostel=h2, name='C',
            defaults={'gender_restriction': 'FEMALE', 'floor_count': 2},
        )[0]

        block_d = Block.objects.get_or_create(
            hostel=h2, name='D',
            defaults={'gender_restriction': 'FEMALE', 'floor_count': 2},
        )[0]

        self.hostels = [h1, h2]
        self.blocks = [block_a, block_b, block_c, block_d]

        # Create rooms and beds
        self.beds = {'male': [], 'female': []}
        for block in [block_a, block_b]:
            for room_num in range(101, 111):  # 10 rooms per block
                room, _ = Room.objects.get_or_create(
                    block=block,
                    room_number=str(room_num),
                    defaults={'floor': 1, 'room_type': 'DOUBLE', 'capacity': 2},
                )
                for bed_letter in ['A', 'B']:
                    bed, _ = Bed.objects.get_or_create(
                        room=room,
                        bed_number=bed_letter,
                        defaults={'is_active': True, 'is_available_for_exchange': True},
                    )
                    self.beds['male'].append(bed)

        for block in [block_c, block_d]:
            for room_num in range(101, 111):
                room, _ = Room.objects.get_or_create(
                    block=block,
                    room_number=str(room_num),
                    defaults={'floor': 1, 'room_type': 'DOUBLE', 'capacity': 2},
                )
                for bed_letter in ['A', 'B']:
                    bed, _ = Bed.objects.get_or_create(
                        room=room,
                        bed_number=bed_letter,
                        defaults={'is_active': True, 'is_available_for_exchange': True},
                    )
                    self.beds['female'].append(bed)

        self.stdout.write(f'  Created {len(self.beds["male"])} male beds, {len(self.beds["female"])} female beds')

    def _create_users(self):
        from apps.accounts.models import User, StudentProfile, WardenAssignment
        from apps.hostels.models import Allocation

        self.stdout.write('Creating demo users...')

        # Admin
        admin, _ = User.objects.get_or_create(
            email='admin@hostel.edu',
            defaults={
                'first_name': 'System',
                'last_name': 'Admin',
                'role': User.Role.HOSTEL_ADMIN,
                'is_staff': True,
            },
        )
        admin.set_password('Admin@123')
        admin.save()

        # Dean
        dean, _ = User.objects.get_or_create(
            email='dean@hostel.edu',
            defaults={'first_name': 'Dean', 'last_name': 'Sharma', 'role': User.Role.DEAN},
        )
        dean.set_password('Dean@123')
        dean.save()

        # Chief Warden
        chief_warden, _ = User.objects.get_or_create(
            email='chiefwarden@hostel.edu',
            defaults={'first_name': 'Chief', 'last_name': 'Warden', 'role': User.Role.CHIEF_WARDEN},
        )
        chief_warden.set_password('Warden@123')
        chief_warden.save()

        # Warden 1 (Boys Hostel)
        warden1, _ = User.objects.get_or_create(
            email='warden.bh1@hostel.edu',
            defaults={'first_name': 'Rajesh', 'last_name': 'Kumar', 'role': User.Role.WARDEN, 'warden_id': 'W101'},
        )
        warden1.warden_id = 'W101'
        warden1.set_password('Warden@123')
        warden1.save()
        if self.hostels:
            WardenAssignment.objects.get_or_create(
                warden=warden1, hostel=self.hostels[0],
                defaults={'is_active': True},
            )

        # Warden 2 (Girls Hostel)
        warden2, _ = User.objects.get_or_create(
            email='warden.gh1@hostel.edu',
            defaults={'first_name': 'Priya', 'last_name': 'Devi', 'role': User.Role.WARDEN, 'warden_id': 'W102'},
        )
        warden2.warden_id = 'W102'
        warden2.set_password('Warden@123')
        warden2.save()
        if len(self.hostels) > 1:
            WardenAssignment.objects.get_or_create(
                warden=warden2, hostel=self.hostels[1],
                defaults={'is_active': True},
            )

        # Chief Warden
        chief_warden.warden_id = 'CW1'
        chief_warden.save(update_fields=['warden_id'])

        # Pre-authorized Wardens Roster
        from apps.accounts.models import AuthorizedStudent, AuthorizedWarden
        w_bh1, _ = AuthorizedWarden.objects.update_or_create(
            warden_id='W101',
            defaults={
                'email': 'warden.bh1@hostel.edu',
                'full_name': 'Rajesh Kumar',
                'role': User.Role.WARDEN,
                'authorization_status': AuthorizedWarden.Status.ACTIVE,
                'is_registered': True,
            }
        )
        if self.hostels:
            w_bh1.assigned_hostels.set([self.hostels[0]])

        w_gh1, _ = AuthorizedWarden.objects.update_or_create(
            warden_id='W102',
            defaults={
                'email': 'warden.gh1@hostel.edu',
                'full_name': 'Priya Devi',
                'role': User.Role.WARDEN,
                'authorization_status': AuthorizedWarden.Status.ACTIVE,
                'is_registered': True,
            }
        )
        if len(self.hostels) > 1:
            w_gh1.assigned_hostels.set([self.hostels[1]])

        w_cw, _ = AuthorizedWarden.objects.update_or_create(
            warden_id='CW1',
            defaults={
                'email': 'chiefwarden@hostel.edu',
                'full_name': 'Dr. K. S. Gill',
                'role': User.Role.CHIEF_WARDEN,
                'authorization_status': AuthorizedWarden.Status.ACTIVE,
                'is_registered': True,
            }
        )
        w_cw.assigned_hostels.set(self.hostels)

        # Candidate for testing Warden signup (not yet registered)
        w_new, _ = AuthorizedWarden.objects.update_or_create(
            warden_id='W105',
            defaults={
                'email': 'new.warden@hostel.edu',
                'full_name': 'Amitabh Sen',
                'role': User.Role.WARDEN,
                'authorization_status': AuthorizedWarden.Status.ACTIVE,
                'is_registered': False,
            }
        )
        if self.hostels:
            w_new.assigned_hostels.set([self.hostels[0]])

        # Students (10 male + 10 female)
        student_data = [
            # Male students
            ('student1@hostel.edu', 'Arjun', 'Verma', '12345678', 'CS', 3, 'MALE', 'BOYS'),
            ('student2@hostel.edu', 'Rahul', 'Singh', '12101002', 'ECE', 3, 'MALE', 'BOYS'),
            ('student3@hostel.edu', 'Vikram', 'Patel', '12101003', 'MECH', 2, 'MALE', 'BOYS'),
            ('student4@hostel.edu', 'Aditya', 'Sharma', '12101004', 'CS', 4, 'MALE', 'BOYS'),
            ('student5@hostel.edu', 'Suresh', 'Nair', '12101005', 'CIVIL', 2, 'MALE', 'BOYS'),
            ('student6@hostel.edu', 'Mohit', 'Gupta', '12101006', 'ECE', 1, 'MALE', 'BOYS'),
            ('student7@hostel.edu', 'Deepak', 'Joshi', '12101007', 'IT', 3, 'MALE', 'BOYS'),
            ('student8@hostel.edu', 'Ravi', 'Kumar', '12101008', 'CS', 2, 'MALE', 'BOYS'),
            # Female students
            ('student9@hostel.edu', 'Priya', 'Mehta', '12101009', 'CS', 3, 'FEMALE', 'GIRLS'),
            ('student10@hostel.edu', 'Anjali', 'Rao', '12101010', 'ECE', 2, 'FEMALE', 'GIRLS'),
            ('student11@hostel.edu', 'Sneha', 'Iyer', '12101011', 'MECH', 3, 'FEMALE', 'GIRLS'),
            ('student12@hostel.edu', 'Kavya', 'Reddy', '12101012', 'CS', 4, 'FEMALE', 'GIRLS'),
        ]

        male_bed_idx = 0
        female_bed_idx = 0

        for email, first, last, roll, dept, year, gender, elig in student_data:
            student, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first, 'last_name': last, 'role': User.Role.STUDENT,
                    'registration_number': roll, 'eligibility_classification': elig,
                },
            )
            student.registration_number = roll
            student.eligibility_classification = elig
            student.set_password('Student@123')
            student.save()

            StudentProfile.objects.update_or_create(
                user=student,
                defaults={
                    'roll_number': roll,
                    'department': dept,
                    'year_of_study': year,
                    'gender': gender,
                    'fee_cleared': True,
                    'disciplinary_hold': False,
                },
            )

            # Pre-authorized Student Roster entry
            AuthorizedStudent.objects.update_or_create(
                registration_number=roll,
                defaults={
                    'email': email,
                    'full_name': f"{first} {last}",
                    'gender': gender,
                    'approved_eligibility': elig,
                    'department': dept,
                    'year_of_study': year,
                    'authorization_status': AuthorizedStudent.Status.ACTIVE,
                    'is_registered': True,
                }
            )

            # Allocate bed if no active allocation
            if not Allocation.objects.filter(student=student, is_active=True).exists():
                if gender == 'MALE' and male_bed_idx < len(self.beds['male']):
                    bed = self.beds['male'][male_bed_idx]
                    male_bed_idx += 1
                elif gender == 'FEMALE' and female_bed_idx < len(self.beds['female']):
                    bed = self.beds['female'][female_bed_idx]
                    female_bed_idx += 1
                else:
                    continue
                Allocation.objects.create(
                    student=student,
                    bed=bed,
                    is_active=True,
                    reason='Demo initial allocation',
                )

        # Pre-authorized student candidates ready for testing signup (is_registered=False)
        AuthorizedStudent.objects.update_or_create(
            registration_number='12345690',
            defaults={
                'email': 'newstudent.boys@hostel.edu',
                'full_name': 'Rohan Mehra',
                'gender': 'MALE',
                'approved_eligibility': 'BOYS',
                'department': 'CSE',
                'year_of_study': 2,
                'authorization_status': AuthorizedStudent.Status.ACTIVE,
                'is_registered': False,
                'initial_hostel_code': 'BH1',
                'initial_room': '105',
                'initial_bed': 'A',
            }
        )
        AuthorizedStudent.objects.update_or_create(
            registration_number='12345691',
            defaults={
                'email': 'newstudent.girls@hostel.edu',
                'full_name': 'Sneha Kapoor',
                'gender': 'FEMALE',
                'approved_eligibility': 'GIRLS',
                'department': 'ECE',
                'year_of_study': 2,
                'authorization_status': AuthorizedStudent.Status.ACTIVE,
                'is_registered': False,
                'initial_hostel_code': 'GH1',
                'initial_room': '105',
                'initial_bed': 'A',
            }
        )

        self.stdout.write('  Created demo users, authorized rosters, and allocations')

    def _create_policies(self):
        from apps.policies.models import PolicyRule

        self.stdout.write('Creating default policies...')
        policies = [
            ('COOLING_OFF_DAYS', '30', 'INTEGER', 'Days after transfer before student can request again'),
            ('REQUEST_VALIDITY_DAYS', '14', 'INTEGER', 'Days an exchange request stays open'),
            ('PROPOSAL_EXPIRY_HOURS', '48', 'INTEGER', 'Hours for all participants to accept a proposal'),
            ('MAX_CYCLE_LENGTH', '5', 'INTEGER', 'Maximum number of participants in a rotation cycle'),
            ('REQUIRE_FEE_CLEARANCE', 'true', 'BOOLEAN', 'Require hostel fee clearance for exchange'),
            ('CHECK_DISCIPLINARY_HOLD', 'true', 'BOOLEAN', 'Block exchanges for students with disciplinary holds'),
            ('CROSS_HOSTEL_REQUIRES_CHIEF_WARDEN', 'true', 'BOOLEAN', 'Cross-hostel exchanges need chief warden approval'),
        ]
        for key, value, vtype, desc in policies:
            PolicyRule.objects.get_or_create(
                key=key, hostel=None,
                defaults={'value': value, 'value_type': vtype, 'description': desc},
            )

    def _print_credentials(self):
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('DEMO CREDENTIALS (Development Only)'))
        self.stdout.write('='*60)
        credentials = [
            ('Admin', 'admin@hostel.edu', 'Admin@123'),
            ('Dean', 'dean@hostel.edu', 'Dean@123'),
            ('Chief Warden', 'chiefwarden@hostel.edu', 'Warden@123'),
            ('Warden (BH1)', 'warden.bh1@hostel.edu', 'Warden@123'),
            ('Warden (GH1)', 'warden.gh1@hostel.edu', 'Warden@123'),
            ('Student 1', 'student1@hostel.edu', 'Student@123'),
            ('Student 2', 'student2@hostel.edu', 'Student@123'),
            ('Student 9', 'student9@hostel.edu', 'Student@123'),
        ]
        for role, email, password in credentials:
            self.stdout.write(f'  {role:20} | {email:35} | {password}')
        self.stdout.write('='*60 + '\n')
