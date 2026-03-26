import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import Members from './Members';
import { useAuthStore } from '../store/authStore';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const membersPayload = {
  data: {
    data: [
      {
        id: 'u1',
        name: 'Alice Banda',
        email: 'alice@example.com',
        phone: '0977000001',
        role: 'member',
        is_active: true,
        group_id: 'g1',
        group_name: 'Alpha Group',
      },
      {
        id: 'u2',
        name: 'Brian Zulu',
        email: 'brian@example.com',
        phone: '0977000002',
        role: 'member',
        is_active: false,
        group_id: null,
        group_name: null,
      },
    ],
  },
};

describe('Members page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null });
  });

  it('loads and renders members from API', async () => {
    axios.get.mockResolvedValue(membersPayload);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });

    expect(axios.get).toHaveBeenCalledWith('/api/users', {
      params: { role: 'member' },
    });
    expect(screen.getAllByText('Brian Zulu').length).toBeGreaterThan(0);
  });

  it('filters members by search query and status', async () => {
    axios.get.mockResolvedValue(membersPayload);
    const user = userEvent.setup();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText('Search by name, email, phone, or group');
    await user.type(searchInput, 'Alice');

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText('Brian Zulu')).toHaveLength(0);

    await user.clear(searchInput);
    const statusSelect = screen.getByDisplayValue('All Status');
    await user.selectOptions(statusSelect, 'inactive');

    await waitFor(() => {
      expect(screen.getAllByText('Brian Zulu').length).toBeGreaterThan(0);
    });
    expect(screen.queryAllByText('Alice Banda')).toHaveLength(0);
  });

  it('shows retry UI when API fails', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows import and add member actions for admin roles only', async () => {
    axios.get.mockResolvedValue(membersPayload);

    act(() => {
      useAuthStore.setState({
        user: { id: 'admin-1', role: 'admin', name: 'Admin User' },
        token: 'token',
      });
    });

    const { rerender } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Alice Banda').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Member' })).toBeInTheDocument();

    act(() => {
      useAuthStore.setState({
        user: { id: 'member-1', role: 'member', name: 'Member User' },
        token: 'token',
      });
    });

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Members />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Member' })).not.toBeInTheDocument();
  });
});
