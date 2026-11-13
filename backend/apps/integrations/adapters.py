"""
Module: backend/apps/integrations/adapters.py

Work / Purpose:
    Defines abstract OccupancyAdapter/ERPAdapter interfaces, mock adapters, and HTTP-backed P03/ERP integration adapters for institutional sync.

Connected Modules (Used By / Routes):
    - backend/apps/integrations/views.py

Helpful / Supporting Modules (Dependencies):
    - abc (external library / framework)
    - django (external library / framework)
    - urllib / json (Python standard library HTTP JSON client)

Original Module Notes:
    External integration adapters.

    Provides abstract interfaces, HTTP live adapters, and mock implementations for:
    - P03 Occupancy API
    - College ERP (fee status, disciplinary records)

    MOCK MODE: Adapters default to mock mode when INTEGRATION_MOCK_MODE=True
    or when live endpoint URLs are not configured.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from django.conf import settings

logger = logging.getLogger(__name__)


def _http_get_json(base_url: str, path: str, api_key: str = '', timeout: int = 10) -> dict:
    """Perform a JSON GET request to an institutional microservice endpoint."""
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    headers = {'Accept': 'application/json'}
    if api_key:
        headers['Authorization'] = f"Bearer {api_key}"

    req = urllib.request.Request(url, headers=headers, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = resp.read().decode('utf-8')
            return json.loads(payload) if payload else {}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as exc:
        logger.error("Institutional API request failed (%s): %s", url, exc)
        raise RuntimeError(f"Institutional integration request failed: {exc}") from exc


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
        logger.info("[MOCK P03] get_student_allocation called for %s", roll_number)
        return {
            'source': 'MOCK_P03',
            'roll_number': roll_number,
            'allocated': True,
            'bed_code': f'MOCK-BED-{roll_number}',
            'note': 'This is mock data. Set INTEGRATION_MOCK_MODE=False and P03_API_URL for live data.',
        }

    def get_bed_occupant(self, bed_code: str) -> dict:
        logger.info("[MOCK P03] get_bed_occupant called for %s", bed_code)
        return {
            'source': 'MOCK_P03',
            'bed_code': bed_code,
            'occupied': True,
            'note': 'This is mock data.',
        }


class HttpP03OccupancyAdapter(OccupancyAdapter):
    """Live HTTP REST client for the institutional P03 hostel occupancy system."""

    def __init__(self, base_url: str, api_key: str = '', timeout: int = 10):
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = timeout

    def get_student_allocation(self, roll_number: str) -> dict:
        encoded = urllib.parse.quote(str(roll_number), safe='')
        data = _http_get_json(self.base_url, f"allocations/student/{encoded}", self.api_key, self.timeout)
        data.setdefault('source', 'LIVE_P03')
        return data

    def get_bed_occupant(self, bed_code: str) -> dict:
        encoded = urllib.parse.quote(str(bed_code), safe='')
        data = _http_get_json(self.base_url, f"beds/{encoded}/occupant", self.api_key, self.timeout)
        data.setdefault('source', 'LIVE_P03')
        return data


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
        logger.info("[MOCK ERP] get_fee_status for %s", roll_number)
        return {
            'source': 'MOCK_ERP',
            'roll_number': roll_number,
            'fee_cleared': True,
            'note': 'This is mock data. Set INTEGRATION_MOCK_MODE=False and ERP_API_URL for live data.',
        }

    def get_disciplinary_status(self, roll_number: str) -> dict:
        logger.info("[MOCK ERP] get_disciplinary_status for %s", roll_number)
        return {
            'source': 'MOCK_ERP',
            'roll_number': roll_number,
            'has_hold': False,
            'note': 'This is mock data.',
        }


class HttpERPAdapter(ERPAdapter):
    """Live HTTP REST client for institutional university ERP fee and disciplinary clearance."""

    def __init__(self, base_url: str, api_key: str = '', timeout: int = 10):
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = timeout

    def get_fee_status(self, roll_number: str) -> dict:
        encoded = urllib.parse.quote(str(roll_number), safe='')
        data = _http_get_json(self.base_url, f"students/{encoded}/fee-clearance", self.api_key, self.timeout)
        data.setdefault('source', 'LIVE_ERP')
        return data

    def get_disciplinary_status(self, roll_number: str) -> dict:
        encoded = urllib.parse.quote(str(roll_number), safe='')
        data = _http_get_json(self.base_url, f"students/{encoded}/disciplinary-status", self.api_key, self.timeout)
        data.setdefault('source', 'LIVE_ERP')
        return data


def get_occupancy_adapter() -> OccupancyAdapter:
    """Factory: return live HTTP adapter when configured outside mock mode, else mock adapter."""
    mock_mode = getattr(settings, 'INTEGRATION_MOCK_MODE', True)
    base_url = getattr(settings, 'P03_API_URL', '').strip()
    if mock_mode or not base_url:
        return MockP03OccupancyAdapter()
    return HttpP03OccupancyAdapter(
        base_url=base_url,
        api_key=getattr(settings, 'P03_API_KEY', ''),
        timeout=getattr(settings, 'INTEGRATION_HTTP_TIMEOUT', 10),
    )


def get_erp_adapter() -> ERPAdapter:
    """Factory: return live HTTP ERP adapter when configured outside mock mode, else mock adapter."""
    mock_mode = getattr(settings, 'INTEGRATION_MOCK_MODE', True)
    base_url = getattr(settings, 'ERP_API_URL', '').strip()
    if mock_mode or not base_url:
        return MockERPAdapter()
    return HttpERPAdapter(
        base_url=base_url,
        api_key=getattr(settings, 'ERP_API_KEY', ''),
        timeout=getattr(settings, 'INTEGRATION_HTTP_TIMEOUT', 10),
    )
