import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { MemberDetail } from './MemberDetails';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const memberDetailPayload = {
  data: {
    data: {
      id: 'u1',
      member_no: 'VB-001',
      name: 'Alice Banda',
      email: 'alice@example.com',
      phone: '0977000001',
      national_id: '123456/11/1',
      role: 'member',
      is_active: true,
      created_at: '2026-01-02T10:00:00.000Z',
      group_name: 'Alpha Group',
      cycle_name: 'Cycle 1 – 2026',
      cycle_status: 'active',
      total_savings: 12000,
      total_savings_interest: 500,
      total_loan_borrowed: 9000,
      outstanding_loan: 3500,
      shortfall: 8000,
      common_interest_amount: 1200,
      verified_savings_count: 3,
      pending_savings_count: 1,
      active_loans_count: 1,
      pending_loans_count: 0,
      recent_savings: [
        {
          id: 's1',
          amount: 500,
          month: 3,
          year: 2026,
          status: 'verified',
          payment_date: '2026-03-15T00:00:00.000Z',
        },
      ],
      recent_loans: [
        {
          id: 'l1',
          amount: 9000,
          total_amount: 12000,
          amount_repaid: 8500,
          status: 'disbursed',
          purpose: 'Business capital',
          requested_date: '2026-02-01T00:00:00.000Z',
          due_date: '2026-06-01T00:00:00.000Z',
        },
      ],
    },
  },
};

describe('MemberDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders member detail data from API', async () => {
    axios.get.mockResolvedValue(memberDetailPayload);

    render(
      <MemoryRouter initialEntries={['/dashboard/members/u1']}>
        <Routes>
          <Route path="/dashboard/members/:memberId" element={<MemberDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Banda')).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith('/api/users/u1/details');
    expect(screen.getByText('VB-001')).toBeInTheDocument();
    expect(screen.getByText('Alpha Group • Cycle 1 – 2026')).toBeInTheDocument();
    expect(screen.getByText('Loan Status')).toBeInTheDocument();
    expect(screen.getByText('Recent Savings')).toBeInTheDocument();
    expect(screen.getByText('Recent Loans')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('shows an error state when member details fail to load', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/dashboard/members/u1']}>
        <Routes>
          <Route path="/dashboard/members/:memberId" element={<MemberDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /back to members/i })).toBeInTheDocument();
  });
});
