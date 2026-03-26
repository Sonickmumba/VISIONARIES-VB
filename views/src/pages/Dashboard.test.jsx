import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

const fetchDashboard = vi.fn(() => Promise.resolve());

const mockState = {
  metrics: {
    totalSavings: 785000,
    totalLoans: 620000,
    availableFunds: 165000,
    activeMembers: 42,
  },
  currentCycle: {
    id: 'cycle-1',
    name: 'Cycle 1 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
  },
  chartData: [
    { month: 'Jan 26', amount: 5000, loans: 1200 },
  ],
  recentActivities: [
    { id: 'a1', color: 'green', text: 'Cycle 1 2026 is currently active', time: 'Current cycle' },
  ],
  pendingActions: [
    { id: 'p1', message: '2 loans currently active in Cycle 1 2026', date: '2026-12-31' },
  ],
  groups: [{ id: 'group-1', name: 'Alpha' }],
  loading: false,
  error: '',
  fetchDashboard,
};

vi.mock('../store/dashboardStore', () => ({
  useDashboardStore: vi.fn((selector) => selector(mockState)),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    fetchDashboard.mockClear();
  });

  it('renders live dashboard data from the store', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cycle 1 2026' })).toBeInTheDocument();
    expect(screen.getByText('K 785,000')).toBeInTheDocument();
    expect(screen.getByText('2 loans currently active in Cycle 1 2026')).toBeInTheDocument();
    expect(fetchDashboard).toHaveBeenCalled();
  });
});
