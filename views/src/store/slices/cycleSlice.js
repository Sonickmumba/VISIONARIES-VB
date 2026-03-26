import { createSlice } from '@reduxjs/toolkit';

// Mock cycles data
const mockCycles = [
  {
    id: '1',
    groupId: '1',
    name: 'January - December 2024',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    duration: 12, // months
    status: 'active',
    totalSavings: 1250000,
    totalLoans: 800000,
    totalInterest: 187500,
    availableFunds: 637500,
    memberCount: 15,
  },
  {
    id: '2',
    groupId: '1',
    name: 'July - December 2023',
    startDate: '2023-07-01',
    endDate: '2023-12-31',
    duration: 6, // months
    status: 'completed',
    totalSavings: 950000,
    totalLoans: 600000,
    totalInterest: 142500,
    availableFunds: 492500,
    memberCount: 14,
  },
];

const initialState = {
  cycles: mockCycles,
  currentCycle: mockCycles[0],
  loading: false,
  error: null,
};

const cycleSlice = createSlice({
  name: 'cycles',
  initialState,
  reducers: {
    setCycles: (state, action) => {
      state.cycles = action.payload;
    },
    setCurrentCycle: (state, action) => {
      state.currentCycle = action.payload;
    },
    addCycle: (state, action) => {
      state.cycles.unshift(action.payload);
      // Set as current cycle if it's active
      if (action.payload.status === 'active') {
        state.currentCycle = action.payload;
      }
    },
    updateCycle: (state, action) => {
      const index = state.cycles.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.cycles[index] = action.payload;
      }
      if (state.currentCycle?.id === action.payload.id) {
        state.currentCycle = action.payload;
      }
    },
    closeCycle: (state, action) => {
      const index = state.cycles.findIndex(c => c.id === action.payload);
      if (index !== -1) {
        state.cycles[index].status = 'completed';
      }
      if (state.currentCycle?.id === action.payload) {
        state.currentCycle = { ...state.currentCycle, status: 'completed' };
      }
    },
    deleteCycle: (state, action) => {
      state.cycles = state.cycles.filter(c => c.id !== action.payload);
      if (state.currentCycle?.id === action.payload) {
        state.currentCycle = state.cycles.find(c => c.status === 'active') || null;
      }
    },
    updateCycleMetrics: (state, action) => {
      const { cycleId, metrics } = action.payload;
      const index = state.cycles.findIndex(c => c.id === cycleId);
      if (index !== -1) {
        state.cycles[index] = { ...state.cycles[index], ...metrics };
      }
      if (state.currentCycle?.id === cycleId) {
        state.currentCycle = { ...state.currentCycle, ...metrics };
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCycles,
  setCurrentCycle,
  addCycle,
  updateCycle,
  closeCycle,
  deleteCycle,
  updateCycleMetrics,
  setLoading,
  setError,
} = cycleSlice.actions;

export default cycleSlice.reducer;
