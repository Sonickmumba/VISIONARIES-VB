import { create } from 'zustand';
import axios from 'axios';

export const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const getResponseData = (response) => response?.data?.data;

const sortCyclesByDateDesc = (cycles) =>
  [...cycles].sort((a, b) => {
    const left = new Date(b.start_date || b.startDate || 0).getTime();
    const right = new Date(a.start_date || a.startDate || 0).getTime();
    return left - right;
  });

const formatCycleLabel = (cycle) => {
  const date = cycle?.start_date || cycle?.startDate || cycle?.created_at || cycle?.createdAt;
  if (!date) return cycle?.name || 'Cycle';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(date));
};

export const getPrimaryCycle = (cycles) => {
  if (!cycles.length) return null;

  return (
    cycles.find((cycle) => String(cycle.status || '').toLowerCase() === 'active') ||
    sortCyclesByDateDesc(cycles)[0]
  );
};

export const buildDashboardModel = ({ groups = [], cycles = [], statsByCycle = {} }) => {
  const sortedCycles = sortCyclesByDateDesc(cycles);
  const currentCycle = getPrimaryCycle(sortedCycles);
  const currentStats = currentCycle ? statsByCycle[currentCycle.id] || {} : {};

  const savingsTotal = toNumber(currentStats?.savings?.total_amount);
  const loanTotal = toNumber(currentStats?.loans?.total_amount);
  const activeMembers = Math.max(
    toNumber(currentStats?.savings?.total_members),
    groups.reduce((sum, group) => sum + toNumber(group.member_count), 0)
  );

  const recentCycles = sortedCycles.slice(0, 6);
  const chartData = recentCycles.length
    ? recentCycles
        .map((cycle) => {
          const cycleStats = statsByCycle[cycle.id] || {};
          return {
            month: formatCycleLabel(cycle),
            amount: toNumber(cycleStats?.savings?.total_amount),
            loans: toNumber(cycleStats?.loans?.total_amount),
          };
        })
        .reverse()
    : [];

  const recentActivities = currentCycle
    ? [
        {
          id: 'cycle',
          color: 'green',
          text: `${currentCycle.name} is currently ${String(currentCycle.status || 'active').toLowerCase()}`,
          time: 'Current cycle',
        },
        {
          id: 'groups',
          color: 'blue',
          text: `${groups.length} active group${groups.length === 1 ? '' : 's'} available`,
          time: 'Live summary',
        },
        {
          id: 'members',
          color: 'purple',
          text: `${activeMembers} active members contributing this cycle`,
          time: 'Live summary',
        },
      ]
    : [
        {
          id: 'empty',
          color: 'blue',
          text: 'No active cycle found yet',
          time: 'Awaiting setup',
        },
      ];

  const pendingActions = currentCycle
    ? [
        toNumber(currentStats?.loans?.active_count) > 0
          ? {
              id: 'active-loans',
              message: `${toNumber(currentStats.loans.active_count)} loan${toNumber(currentStats.loans.active_count) === 1 ? '' : 's'} currently active in ${currentCycle.name}`,
              date: currentCycle.end_date || currentCycle.endDate || new Date().toISOString(),
            }
          : null,
        toNumber(currentStats?.loans?.defaulted_count) > 0
          ? {
              id: 'defaulted-loans',
              message: `${toNumber(currentStats.loans.defaulted_count)} loan${toNumber(currentStats.loans.defaulted_count) === 1 ? '' : 's'} marked as defaulted`,
              date: currentCycle.end_date || currentCycle.endDate || new Date().toISOString(),
            }
          : null,
        loanTotal > savingsTotal
          ? {
              id: 'funding-gap',
              message: 'Loan exposure is higher than total verified savings',
              date: currentCycle.end_date || currentCycle.endDate || new Date().toISOString(),
            }
          : null,
      ].filter(Boolean)
    : [];

  return {
    groups,
    cycles: sortedCycles,
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          name: currentCycle.name,
          startDate: currentCycle.start_date || currentCycle.startDate,
          endDate: currentCycle.end_date || currentCycle.endDate,
          status: currentCycle.status || 'active',
          groupId: currentCycle.group_id || currentCycle.groupId,
        }
      : null,
    metrics: {
      totalSavings: savingsTotal,
      totalLoans: loanTotal,
      availableFunds: Math.max(0, savingsTotal - loanTotal),
      activeMembers,
    },
    chartData,
    recentActivities,
    pendingActions,
  };
};

const defaultState = {
  metrics: {
    totalSavings: 0,
    totalLoans: 0,
    availableFunds: 0,
    activeMembers: 0,
  },
  currentCycle: null,
  chartData: [],
  recentActivities: [],
  pendingActions: [],
  groups: [],
  cycles: [],
  loading: false,
  error: '',
  lastFetchedAt: 0,
};

export const useDashboardStore = create((set, get) => ({
  ...defaultState,

  reset: () => set(defaultState),

  fetchDashboard: async (force = false) => {
    const { lastFetchedAt, loading } = get();
    const isFresh = Date.now() - lastFetchedAt < DASHBOARD_CACHE_TTL;

    if (!force && (loading || isFresh)) {
      return get();
    }

    set({ loading: true, error: '' });

    try {
      const groupsResponse = await axios.get('/api/groups');
      const groups = toArray(getResponseData(groupsResponse));

      const cyclesResponses = await Promise.allSettled(
        groups.map((group) => axios.get(`/api/cycles/group/${group.id}`))
      );

      const cycles = cyclesResponses.flatMap((result, index) => {
        if (result.status !== 'fulfilled') return [];
        const groupCycles = toArray(getResponseData(result.value));
        return groupCycles.map((cycle) => ({ ...cycle, group_id: cycle.group_id || groups[index]?.id }));
      });

      const statsTargetIds = sortCyclesByDateDesc(cycles)
        .slice(0, 6)
        .map((cycle) => cycle.id);

      const statsResponses = await Promise.allSettled(
        statsTargetIds.map((cycleId) => axios.get(`/api/cycles/${cycleId}/statistics`))
      );

      const statsByCycle = statsResponses.reduce((acc, result, index) => {
        if (result.status === 'fulfilled') {
          acc[statsTargetIds[index]] = getResponseData(result.value) || {};
        }
        return acc;
      }, {});

      const model = buildDashboardModel({ groups, cycles, statsByCycle });

      set({
        ...model,
        loading: false,
        error: '',
        lastFetchedAt: Date.now(),
      });

      return get();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load dashboard data';

      set({
        loading: false,
        error: message,
      });

      throw error;
    }
  },
}));
