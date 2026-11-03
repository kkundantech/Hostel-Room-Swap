"""
External integration adapters.

Provides abstract interfaces and mock implementations for:
- P03 Occupancy API
- College ERP (fee status, disciplinary records)
- SMS gateway

MOCK MODE: All adapters default to mock mode when INTEGRATION_MOCK_MODE=True.
Mock results are clearly labeled. Never pretend live data is returned.
"""
import logging
from abc import ABC, abstractmethod
from django.conf import settings

logger = logging.getLogger(__name__)

MOCK_MODE = getattr(settings, 'INTEGRATION_MOCK_MODE', True)


class OccupancyAdapter(ABC):
    """Abstract interface for the P03 hostel occupancy system."""

    @abstractmethod
    def get_student_allocation(self, roll_number: str) -> dict:
        """Return student's current allocation from P03."""
        pass

    @abstractmethod
    def get_bed_occupant(self, bed_code: str) -> dict:
        """Return current occupant of a bed from P03."""
        pass


class MockP03OccupancyAdapter(OccupancyAdapter):
    """
    Mock P03 adapter for development and testing.
    Returns demo data clearly labeled as mock.
    """

    def get_student_allocation(self, roll_number: str) -> dict:
        logger.info(f"[MOCK P03] get_student_allocation called for {roll_number}")
        return {
            'source': 'MOCK_P03',
            'roll_number': roll_number,
            'allocated': True,
            'bed_code': f'MOCK-BED-{roll_number}',
            'note': 'This is mock data. Connect P03_API_URL for live data.',
        }

    def get_bed_occupant(self, bed_code: str) -> dict:
        logger.info(f"[MOCK P03] get_bed_occupant called for {bed_code}")
        return {
            'source': 'MOCK_P03',
            'bed_code': bed_code,
            'occupied': True,
            'note': 'This is mock data.',
        }


class ERPAdapter(ABC):
    """Abstract interface for the college ERP."""

    @abstractmethod
    def get_fee_status(self, roll_number: str) -> dict:
        pass

    @abstractmethod
    def get_disciplinary_status(self, roll_number: str) -> dict:
        pass


class MockERPAdapter(ERPAdapter):
    """Mock ERP adapter returning demo clearance data."""

    def get_fee_status(self, roll_number: str) -> dict:
        logger.info(f"[MOCK ERP] get_fee_status for {roll_number}")
        return {
            'source': 'MOCK_ERP',
            'roll_number': roll_number,
            'fee_cleared': True,
            'note': 'This is mock data. Connect ERP_API_URL for live data.',
        }

    def get_disciplinary_status(self, roll_number: str) -> dict:
        logger.info(f"[MOCK ERP] get_disciplinary_status for {roll_number}")
        return {
            'source': 'MOCK_ERP',
            'roll_number': roll_number,
            'has_hold': False,
            'note': 'This is mock data.',
        }


def get_occupancy_adapter() -> OccupancyAdapter:
    """Factory: return the appropriate adapter based on config."""
    if MOCK_MODE or not settings.P03_API_URL if hasattr(settings, 'P03_API_URL') else True:
        return MockP03OccupancyAdapter()
    # Real adapter would be instantiated here
    return MockP03OccupancyAdapter()


def get_erp_adapter() -> ERPAdapter:
    """Factory: return the appropriate ERP adapter."""
    if MOCK_MODE:
        return MockERPAdapter()
    return MockERPAdapter()
