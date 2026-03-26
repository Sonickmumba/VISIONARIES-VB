import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDashboardModel,
  DASHBOARD_CACHE_TTL,
  useDashboardStore,
} from './dashboardStore';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockGroupsResponse = {
  data: {
    data: [
      { id: 'group-1', name: 'Alpha', member_count: '12' },
      { id: 'group-2', name: 'Beta', member_count: '8' },
    ],
  },
};

const mockCyclesByGroup = {
  'group-1': {
    data: {
      data: [
        {
          id: 'cycle-1',
          group_id: 'group-1',
          name: 'Cycle 1 2026',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active',
        },
      ],
    },
  },
  'group-2': {
    data: {
      data: [
        {
          id: 'cycle-2',
          group_id: 'group-2',
          name: 'Cycle 4 2025',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'closed',
        },
      ],
    },
  },
};

const mockStats = {
  'cycle-1': {
    data: {
      data: {
        savings: { total_amount: '5000', total_members: '15' },
        loans: { total_amount: '1200', active_count: '2', defaulted_count: '1' },
      },
    },
  },
  'cycle-2': {
    data: {
      data: {
        savings: { total_amount: '3500', total_members: '9' },
        loans: { total_amount: '500', active_count: '0', defaulted_count: '0' },
      },
    },
  },
};

describe('buildDashboardModel', () => {
  it('derives metrics, chart data, and pending actions from live endpoint data', () => {
    const result = buildDashboardModel({
      groups: mockGroupsResponse.data.data,
      cycles: [
        mockCyclesByGroup['group-1'].data.data[0],
        mockCyclesByGroup['group-2'].data.data[0],
      ],
      statsByCycle: {
        'cycle-1': mockStats['cycle-1'].data.data,
        'cycle-2': mockStats['cycle-2'].data.data,
      },
    });

    expect(result.currentCycle?.id).toBe('cycle-1');
    expect(result.metrics).toEqual({
      totalSavings: 5000,
      totalLoans: 1200,
      availableFunds: 3800,
      activeMembers: 20,
    });
    expect(result.chartData).toHaveLength(2);
    expect(result.pendingActions).toHaveLength(2);
    expect(result.recentActivities[0].text).toContain('Cycle 1 2026');
  });
});

describe('useDashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().reset();
  });

  it('fetches dashboard data once and caches it within the ttl window', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/groups') return Promise.resolve(mockGroupsResponse);
      if (url === '/api/cycles/group/group-1') return Promise.resolve(mockCyclesByGroup['group-1']);
      if (url === '/api/cycles/group/group-2') return Promise.resolve(mockCyclesByGroup['group-2']);
      if (url === '/api/cycles/cycle-1/statistics') return Promise.resolve(mockStats['cycle-1']);
      if (url === '/api/cycles/cycle-2/statistics') return Promise.resolve(mockStats['cycle-2']);
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    await useDashboardStore.getState().fetchDashboard();

    expect(useDashboardStore.getState().metrics.totalSavings).toBe(5000);
    expect(axios.get).toHaveBeenCalledTimes(5);

    await useDashboardStore.getState().fetchDashboard();

    expect(axios.get).toHaveBeenCalledTimes(5);
    expect(Date.now() - useDashboardStore.getState().lastFetchedAt).toBeLessThan(DASHBOARD_CACHE_TTL);
  });
});
