"""
Hostel, Block, Room, Bed, and Allocation models.

Design decisions:
- Allocation is the single source of truth for "who occupies which bed".
- A Bed's current occupant is determined by the active Allocation (is_active=True).
- Database constraints enforce that a bed has at most one active occupant,
  and a student has at most one active allocation.
- Compatible with the P03 hostel occupancy system through adapter interfaces
  defined in apps.integrations.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Hostel(models.Model):
    """
    Represents a hostel building.

    Invariant: gender restriction enforced at block level, not hostel level,
    to support mixed-gender hostels with separate blocks.
    """
    class HostelCategory(models.TextChoices):
        BOYS = 'BOYS', "Boys' Hostel"
        GIRLS = 'GIRLS', "Girls' Hostel"
        COED = 'COED', "Co-ed / Special"

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(
        max_length=10,
        unique=True,
        db_index=True,
        help_text='Short unique code, e.g., BH1, GH2',
    )
    hostel_category = models.CharField(
        max_length=10,
        choices=HostelCategory.choices,
        default=HostelCategory.BOYS,
        db_index=True,
        help_text='Controlled hostel category for gender and room exchange eligibility',
    )
    eligibility_policy = models.CharField(
        max_length=100,
        default='STANDARD_GENDER_RESTRICTION',
        blank=True,
        help_text='Institution-approved eligibility rule identifier',
    )
    address = models.TextField(blank=True)
    total_blocks = models.PositiveIntegerField(default=1)
    warden_contact = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hostels'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Block(models.Model):
    """
    A block/wing within a hostel.

    Gender restriction is applied at this level to support
    hostels with separate male/female blocks.
    """

    class GenderRestriction(models.TextChoices):
        MALE = 'MALE', 'Male Only'
        FEMALE = 'FEMALE', 'Female Only'
        ANY = 'ANY', 'Any Gender'

    hostel = models.ForeignKey(
        Hostel,
        on_delete=models.CASCADE,
        related_name='blocks',
    )
    name = models.CharField(max_length=50, help_text='Block name, e.g., A, B, North Wing')
    floor_count = models.PositiveIntegerField(default=1)
    gender_restriction = models.CharField(
        max_length=10,
        choices=GenderRestriction.choices,
        default=GenderRestriction.ANY,
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blocks'
        unique_together = ['hostel', 'name']
        ordering = ['hostel', 'name']

    def __str__(self):
        return f"{self.hostel.code}-{self.name}"


class Room(models.Model):
    """
    A room within a block.

    Each room has a number and capacity (number of beds).
    """

    class RoomType(models.TextChoices):
        SINGLE = 'SINGLE', 'Single Occupancy'
        DOUBLE = 'DOUBLE', 'Double Occupancy'
        TRIPLE = 'TRIPLE', 'Triple Occupancy'
        QUAD = 'QUAD', 'Quad Occupancy'

    block = models.ForeignKey(
        Block,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    room_number = models.CharField(max_length=20, help_text='Room number, e.g., 101, A-201')
    floor = models.PositiveSmallIntegerField(default=1)
    room_type = models.CharField(
        max_length=10,
        choices=RoomType.choices,
        default=RoomType.DOUBLE,
    )
    capacity = models.PositiveSmallIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(8)],
    )
    is_active = models.BooleanField(default=True, db_index=True)
    is_available_for_exchange = models.BooleanField(
        default=True,
        help_text='Whether beds in this room can participate in exchanges',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rooms'
        unique_together = ['block', 'room_number']
        ordering = ['block', 'room_number']
        indexes = [
            models.Index(fields=['block', 'is_active']),
        ]

    def __str__(self):
        return f"{self.block}-{self.room_number}"

    @property
    def hostel(self):
        return self.block.hostel


class Bed(models.Model):
    """
    Individual bed within a room.

    This is the finest unit of occupancy. Each student allocation
    is tied to a specific bed.
    """
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='beds',
    )
    bed_number = models.CharField(
        max_length=10,
        help_text='Bed identifier within the room, e.g., A, B, 1, 2',
    )
    is_active = models.BooleanField(default=True, db_index=True)
    is_available_for_exchange = models.BooleanField(
        default=True,
        help_text='Whether this bed can participate in exchanges',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'beds'
        unique_together = ['room', 'bed_number']
        ordering = ['room', 'bed_number']
        indexes = [
            models.Index(fields=['room', 'is_active']),
        ]

    def __str__(self):
        return f"{self.room}-Bed{self.bed_number}"

    @property
    def block(self):
        return self.room.block

    @property
    def hostel(self):
        return self.room.block.hostel

    @property
    def full_label(self):
        """Human-readable full location: Hostel-Block-Room-Bed"""
        return f"{self.hostel.code}/{self.block.name}/{self.room.room_number}/Bed-{self.bed_number}"


class Allocation(models.Model):
    """
    Authoritative record of a student's bed assignment.

    INVARIANTS (enforced by DB constraints + application logic):
    1. A bed can have at most one active allocation (unique constraint on bed + is_active=True).
    2. A student can have at most one active allocation.
    3. Every completed transfer references a proposal.
    4. No occupancy changes occur without all required acceptances and approvals.
    5. A failed multi-party exchange leaves all allocations unchanged (atomic transactions).
    6. An already-executed proposal cannot execute again.

    The `is_active` flag determines current occupancy. When a transfer occurs,
    the old allocation is deactivated and a new one is created, maintaining
    a complete history.
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='allocations',
        limit_choices_to={'role': 'STUDENT'},
    )
    bed = models.ForeignKey(
        Bed,
        on_delete=models.CASCADE,
        related_name='allocations',
    )
    is_active = models.BooleanField(default=True, db_index=True)
    allocated_at = models.DateTimeField(auto_now_add=True)
    deallocated_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(
        max_length=255,
        blank=True,
        help_text='Reason for this allocation (initial, exchange, admin)',
    )

    # Reference to the proposal that caused this allocation (null for initial allocations)
    source_proposal = models.ForeignKey(
        'proposals.ExchangeProposal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resulting_allocations',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'allocations'
        ordering = ['-allocated_at']
        indexes = [
            models.Index(fields=['student', 'is_active']),
            models.Index(fields=['bed', 'is_active']),
        ]
        constraints = [
            # A student can have at most one active allocation
            models.UniqueConstraint(
                fields=['student'],
                condition=models.Q(is_active=True),
                name='unique_active_allocation_per_student',
            ),
            # A bed can have at most one active occupant
            models.UniqueConstraint(
                fields=['bed'],
                condition=models.Q(is_active=True),
                name='unique_active_occupant_per_bed',
            ),
        ]

    def __str__(self):
        status_label = "Active" if self.is_active else "Inactive"
        return f"{self.student.email} -> {self.bed.full_label} ({status_label})"
