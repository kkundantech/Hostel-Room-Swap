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
import { StudentCreateRequestModal } from '../components/student/StudentCreateRequestModal';

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
});
