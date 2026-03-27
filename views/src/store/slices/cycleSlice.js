import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ── Async Thunks ─────────────────────────────────────────────────────────────

/** Fetch all cycles for a group */
export const fetchCyclesByGroup = createAsyncThunk(
  'cycles/fetchByGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/cycles/group/${groupId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load cycles');
    }
  }
);

/** Fetch a single cycle by ID (includes statistics) */
export const fetchCycleById = createAsyncThunk(
  'cycles/fetchById',
  async (cycleId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/cycles/${cycleId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load cycle');
    }
  }
);

/** Fetch cycle statistics */
export const fetchCycleStatistics = createAsyncThunk(
  'cycles/fetchStatistics',
  async (cycleId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/cycles/${cycleId}/statistics`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load statistics');
    }
  }
);

/** Create a new cycle */
export const createCycleAsync = createAsyncThunk(
  'cycles/create',
  async ({ groupId, name, startDate, endDate }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post('/api/cycles', { groupId, name, startDate, endDate });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create cycle');
    }
  }
);

/** Close a cycle */
export const closeCycleAsync = createAsyncThunk(
  'cycles/close',
  async (cycleId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/cycles/${cycleId}/close`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to close cycle');
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const cycleSlice = createSlice({
  name: 'cycles',
  initialState: {
    cycles: [],
    currentCycle: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentCycle: (state, action) => {
      state.currentCycle = action.payload;
    },
    clearCycleError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchCyclesByGroup ─────────────────────────────────────────────
      .addCase(fetchCyclesByGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCyclesByGroup.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.cycles = payload;
        // Auto-select the first active cycle, or fall back to first cycle
        const activeCycle = payload.find((c) => c.status === 'active');
        state.currentCycle = activeCycle || payload[0] || null;
      })
      .addCase(fetchCyclesByGroup.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── fetchCycleById ─────────────────────────────────────────────────
      .addCase(fetchCycleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCycleById.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentCycle = payload;
      })
      .addCase(fetchCycleById.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── createCycleAsync ───────────────────────────────────────────────
      .addCase(createCycleAsync.fulfilled, (state, { payload }) => {
        state.cycles.unshift(payload);
        if (payload.status === 'active') {
          state.currentCycle = payload;
        }
      })
      // ── closeCycleAsync ────────────────────────────────────────────────
      .addCase(closeCycleAsync.fulfilled, (state, { payload }) => {
        const idx = state.cycles.findIndex((c) => c.id === payload.id);
        if (idx !== -1) state.cycles[idx] = payload;
        if (state.currentCycle?.id === payload.id) {
          state.currentCycle = payload;
        }
      });
  },
});

export const { setCurrentCycle, clearCycleError } = cycleSlice.actions;

export default cycleSlice.reducer;
