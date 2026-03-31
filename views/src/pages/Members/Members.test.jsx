import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import memberReducer from '../../store/slices/memberSlice';
import axios from 'axios';

vi.mock('axios');

// framer-motion needs IntersectionObserver in jsdom
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

let Members;
beforeAll(async () => {
  ({ Members } = await import('./Members'));
});

const mockMembers = [
  {
    id: 'u1',
    name: 'Alice Banda',
    email: 'alice@example.com',
    phone: '0977000001',
    role: 'member',
    is_active: true,
    member_no: 'VB-001',
    group_id: 'g1',
    group_name: 'Alpha Group',
    total_savings: 180000,
    outstanding_loan: 25000,
    shortfall: 0,
  },
  {
    id: 'u2',
    name: 'Brian Zulu',
    email: 'brian@example.com',
    phone: '0977000002',
    role: 'member',
    is_active: false,
    member_no: 'VB-002',
    group_id: null,
    group_name: null,
    total_savings: 5000,
    outstanding_loan: 0,
    shortfall: 15000,
  },
];

const makeStore = (overrides = {}) =>
  configureStore({
    reducer: { auth: authReducer, members: memberReducer },
    middleware: (gDM) => gDM({ serializableCheck: false }),
    preloadedState: {
      auth: { user: null, loading: false, initializing: false, error: null },
      members: { members: [], loading: false, error: null },
      ...overrides,
    },
  });

const renderMembers = (store) =>
  render(
    <Provider store={store ?? makeStore()}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    </Provider>
  );

describe('Members page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders members from the API', async () => {
    axios.get.mockResolvedValue({ data: { data: mockMembers } });

    renderMembers();

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Brian Zulu').length).toBeGreaterThan(0);
  });

  it('filters members by search query', async () => {
    const store = makeStore({
      members: { members: mockMembers, loading: false, error: null },
    });
    const user = userEvent.setup();

    renderMembers(store);

    expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Brian Zulu').length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or group');
    await user.type(searchInput, 'Alice');

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText('Brian Zulu')).toHaveLength(0);
  });

  it('filters members by status', async () => {
    const store = makeStore({
      members: { members: mockMembers, loading: false, error: null },
    });
    const user = userEvent.setup();

    renderMembers(store);

    const statusSelect = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusSelect, 'inactive');

    await waitFor(() => {
      expect(screen.getAllByText('Brian Zulu').length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText('Alice Banda')).toHaveLength(0);
  });

  it('shows error and retry button when fetch fails', async () => {
    axios.get.mockRejectedValue({ response: { data: { message: 'Network error' } } });

    renderMembers();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows import and add member buttons for admin only', async () => {
    const adminStore = makeStore({
      auth: { user: { id: 'a1', role: 'admin', name: 'Admin' }, loading: false, initializing: false, error: null },
      members: { members: mockMembers, loading: false, error: null },
    });

    const { unmount } = renderMembers(adminStore);

    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();

    unmount();

    const memberStore = makeStore({
      auth: { user: { id: 'm1', role: 'member', name: 'Member' }, loading: false, initializing: false, error: null },
      members: { members: mockMembers, loading: false, error: null },
    });

    renderMembers(memberStore);

    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument();
  });
});
