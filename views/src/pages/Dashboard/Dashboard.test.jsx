import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeAll, describe, expect, it } from 'vitest';
import Dashboard from './Dashboard';

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const makeStore = () =>
  configureStore({
    reducer: {
      auth: () => ({ user: null, loading: false, initializing: false, error: null }),
      cycles: () => ({
        currentCycle: {
          id: 'cycle-1',
          name: 'Cycle 1 2026',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'Active',
          totalSavings: 785000,
          totalLoans: 620000,
          availableFunds: 165000,
        },
        cycles: [],
        loading: false,
        error: null,
      }),
      members: () => ({
        members: Array.from({ length: 42 }, (_, i) => ({ id: String(i + 1) })),
        loading: false,
        error: null,
      }),
      notifications: () => ({
        notifications: [
          { id: 'n1', message: '2 loans currently active in Cycle 1 2026', read: false, date: '2026-12-31' },
        ],
        unreadCount: 1,
        loading: false,
        error: null,
      }),
      groups: () => ({
        selectedGroup: { id: 'group-1', name: 'Alpha' },
        groups: [],
        loading: false,
        error: null,
      }),
    },
    middleware: (gDM) => gDM({ serializableCheck: false }),
  });

const renderDashboard = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </Provider>
  );

describe('Dashboard', () => {
  it('renders dashboard heading and cycle info', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cycle 1 2026' })).toBeInTheDocument();
  });

  it('renders metric cards from Redux state', () => {
    renderDashboard();
    expect(screen.getByText(/K\s*785/)).toBeInTheDocument();
    expect(screen.getByText(/K\s*620/)).toBeInTheDocument();
    expect(screen.getByText(/K\s*165/)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders pending actions from notifications', () => {
    renderDashboard();
    expect(screen.getByText('2 loans currently active in Cycle 1 2026')).toBeInTheDocument();
  });

  it('renders quick action links', () => {
    renderDashboard();
    expect(screen.getByText('Record Savings')).toBeInTheDocument();
    expect(screen.getByText('View Members')).toBeInTheDocument();
  });
});
