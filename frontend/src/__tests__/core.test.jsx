/**
 * Module: frontend/src/__tests__/core.test.jsx
 *
 * Work / Purpose:
 *   Automated Vitest unit and component tests covering StatusBadge, role navigation config, DemoSwitcherModal gating, and StudentCreateRequestModal.
 *
 * Connected Modules (Used By / Consumers):
 *   - Vitest test runner (frontend/package.json test script)
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/common/StatusBadge.jsx
 *   - frontend/src/components/layout/navConfig.jsx
 *   - frontend/src/components/student/StudentCreateRequestModal.jsx
 *   - frontend/src/context/AuthContext.jsx
 *   - @testing-library/react (npm package)
 *   - vitest (npm package)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/common/StatusBadge';
import { getRoleNavItems } from '../components/layout/navConfig';
import { StudentCreateRequestModal, checkFloorAvailability } from '../components/student/StudentCreateRequestModal';

describe('StatusBadge', () => {
  it('renders semantic labels for known workflow states', () => {
    render(<StatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Awaiting Warden Approval')).toBeInTheDocument();
  });

  it('falls back cleanly for unknown status strings', () => {
    render(<StatusBadge status="CUSTOM_STATE" />);
    expect(screen.getByText('CUSTOM STATE')).toBeInTheDocument();
  });
});

describe('navConfig getRoleNavItems', () => {
  it('returns student portal routes and pending proposal badge', () => {
    const items = getRoleNavItems({
      isStudent: true,
      pendingProposalsCount: 3,
      unreadNotificationsCount: 2,
    });
    const labels = items.map((i) => i.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Swap Proposals');
    const proposalsItem = items.find((i) => i.label === 'Swap Proposals');
    expect(proposalsItem.badge).toBe(3);
  });

  it('returns warden portal routes when isWarden is true', () => {
    const items = getRoleNavItems({
      isWarden: true,
      pendingApprovalsCount: 5,
      unreadNotificationsCount: 0,
    });
    const labels = items.map((i) => i.label);
    expect(labels).toContain('Request Approvals');
    expect(labels).toContain('Occupancy View');
    const approvalsItem = items.find((i) => i.label === 'Request Approvals');
    expect(approvalsItem.badge).toBe(5);
  });
});

describe('StudentCreateRequestModal', () => {
  it('renders nothing when closed and renders form when open', () => {
    const { rerender } = render(
      <StudentCreateRequestModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        hostels={[]}
        selectedHostel=""
        setSelectedHostel={vi.fn()}
        preferredSeater="2 Seater"
        setPreferredSeater={vi.fn()}
        preferredFloor="Any Floor"
        setPreferredFloor={vi.fn()}
        reason=""
        setReason={vi.fn()}
        submitting={false}
      />
    );
    expect(screen.queryByText('Create Room Exchange Request')).not.toBeInTheDocument();

    rerender(
      <StudentCreateRequestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        hostels={[{ id: 1, name: 'Boys Hostel 1', code: 'BH1', gender: 'BOYS' }]}
        selectedHostel=""
        setSelectedHostel={vi.fn()}
        preferredSeater="2 Seater"
        setPreferredSeater={vi.fn()}
        preferredFloor="Any Floor"
        setPreferredFloor={vi.fn()}
        reason=""
        setReason={vi.fn()}
        submitting={false}
      />
    );
    expect(screen.getByText('Create Room Exchange Request')).toBeInTheDocument();
    expect(screen.getByText(/Boys Hostel 1 \(BH1\)/)).toBeInTheDocument();
  });

  it('displays floor availability warning when requested floor is unavailable in BH1 or BH2', () => {
    // 1. Logic function check
    const warningBH1 = checkFloorAvailability('BH1', '4th Floor', [
      { id: 1, name: 'Boys Hostel 1', code: 'BH1', max_floor: 3, available_floors: [1] }
    ]);
    expect(warningBH1).not.toBeNull();
    expect(warningBH1.message).toContain('Currently it is not available on Boys Hostel 1, maybe in future you can try.');

    const warningAny = checkFloorAvailability('BH1', 'Any Floor', []);
    expect(warningAny).toBeNull();

    // 2. Component render check
    render(
      <StudentCreateRequestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        hostels={[{ id: 1, name: 'Boys Hostel 1', code: 'BH1', max_floor: 3, available_floors: [1] }]}
        selectedHostel="1"
        setSelectedHostel={vi.fn()}
        preferredSeater="2 Seater"
        setPreferredSeater={vi.fn()}
        preferredFloor="4th Floor"
        setPreferredFloor={vi.fn()}
        reason="Testing floor warning"
        setReason={vi.fn()}
        submitting={false}
      />
    );

    expect(screen.getByText(/Floor Availability Advisory/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently it is not available on Boys Hostel 1, maybe in future you can try\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Room Not Available — Cannot Go Ahead/i })).toBeDisabled();
  });

  it('enables submit button and shows ready to go ahead when room/floor is available', () => {
    const availableCheck = checkFloorAvailability('1', 'Ground Floor', [
      { id: 1, name: 'Boys Hostel 1', code: 'BH1', max_floor: 3, available_floors: [1] }
    ]);
    expect(availableCheck).toBeNull();

    render(
      <StudentCreateRequestModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        hostels={[{ id: 1, name: 'Boys Hostel 1', code: 'BH1', max_floor: 3, available_floors: [1] }]}
        selectedHostel="1"
        setSelectedHostel={vi.fn()}
        preferredSeater="2 Seater"
        setPreferredSeater={vi.fn()}
        preferredFloor="Ground Floor"
        setPreferredFloor={vi.fn()}
        reason="Semester exchange request"
        setReason={vi.fn()}
        submitting={false}
      />
    );

    expect(screen.getByText('Room Available')).toBeInTheDocument();
    expect(screen.getByText('Ready to Go Ahead')).toBeInTheDocument();
    const goAheadBtn = screen.getByRole('button', { name: /Go Ahead & Submit Request/i });
    expect(goAheadBtn).toBeInTheDocument();
    expect(goAheadBtn).not.toBeDisabled();
  });
});
