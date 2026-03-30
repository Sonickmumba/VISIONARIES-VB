import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ── Async Thunks ─────────────────────────────────────────────────────────────

/** Fetch savings for a given cycle */
export const fetchSavingsByCycle = createAsyncThunk(
  'savings/fetchByCycle',
  async (cycleId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/savings/cycle/${cycleId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load savings');
    }
  }
);

/** Fetch savings for a given user */
export const fetchSavingsByUser = createAsyncThunk(
  'savings/fetchByUser',
  async (userId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/savings/user/${userId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load savings');
    }
  }
);

/** Create a single savings record */
export const createSavingsRecord = createAsyncThunk(
  'savings/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post('/api/savings', payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to record savings');
    }
  }
);

/** Create bulk savings for multiple members in one transaction */
export const createBulkSavings = createAsyncThunk(
  'savings/createBulk',
  async (payload, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post('/api/savings/bulk', payload);
      return res.data;
    } catch (err) {
      const body = err.response?.data || {};
      return rejectWithValue({
        message: body.message || 'Failed to record bulk savings',
        duplicateUserIds: body.duplicateUserIds || null,
        overLimitUsers: body.overLimitUsers || null,
      });
    }
  }
);

/** Verify (or reject) a savings record */
export const verifySavingsRecord = createAsyncThunk(
  'savings/verify',
  async ({ id, status, verifiedBy, verifiedAt }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/savings/${id}/verify`, { status, verifiedBy, verifiedAt });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to verify savings');
    }
  }
);

/** Delete a savings record */
export const deleteSavingsRecord = createAsyncThunk(
  'savings/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/savings/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete savings');
    }
  }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

const mapSaving = (s) => ({
  id: s.id,
  userId: s.user_id ?? s.userId,
  userName: s.user_name ?? s.userName,
  memberName: s.memberName ?? s.user_name ?? s.userName,
  email: s.email,
  cycleId: s.cycle_id ?? s.cycleId,
  amount: s.amount,
  month: s.month,
  year: s.year,
  notes: s.notes,
  status: s.status,
  paymentDate: s.payment_date ?? s.paymentDate,
  proofUrl: s.proof_url ?? s.proofUrl,
  interestEarned: s.interestEarned ?? s.interest_earned,
  verifiedBy: s.verified_by ?? s.verifiedBy,
  verifiedByName: s.verified_by_name ?? s.verifiedByName,
  verifiedAt: s.verified_at ?? s.verifiedAt,
  createdAt: s.created_at ?? s.createdAt,
  updatedAt: s.updated_at ?? s.updatedAt,
});

// ── Slice ────────────────────────────────────────────────────────────────────

const savingsSlice = createSlice({
  name: 'savings',
  initialState: {
    savings: [],
    loading: false,
    submitting: false,
    error: null,
    stale: true,
  },
  reducers: {
    setSavings: (state, action) => {
      state.savings = action.payload;
    },
    addSavings: (state, action) => {
      state.savings.push(action.payload);
    },
    updateSavings: (state, action) => {
      const index = state.savings.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.savings[index] = action.payload;
      }
    },
    verifySavings: (state, action) => {
      const { id, status, verifiedBy, verifiedAt } = action.payload;
      const index = state.savings.findIndex(s => s.id === id);
      if (index !== -1) {
        state.savings[index].status = status;
        state.savings[index].verifiedBy = verifiedBy;
        state.savings[index].verifiedAt = verifiedAt;
      }
    },
    deleteSavings: (state, action) => {
      state.savings = state.savings.filter(s => s.id !== action.payload);
    },
    clearSavingsError(state) {
      state.error = null;
    },
    invalidateSavings(state) {
      state.stale = true;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetch by cycle ───────────────────────────────────────
      .addCase(fetchSavingsByCycle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavingsByCycle.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.savings = (payload || []).map(mapSaving);
        state.stale = false;
      })
      .addCase(fetchSavingsByCycle.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── fetch by user ────────────────────────────────────────
      .addCase(fetchSavingsByUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavingsByUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.savings = (payload || []).map(mapSaving);
        state.stale = false;
      })
      .addCase(fetchSavingsByUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── create single ────────────────────────────────────────
      .addCase(createSavingsRecord.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createSavingsRecord.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.savings.push(mapSaving(payload));
      })
      .addCase(createSavingsRecord.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      })
      // ── create bulk ──────────────────────────────────────────
      .addCase(createBulkSavings.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createBulkSavings.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.savings.push(...(payload || []).map(mapSaving));
      })
      .addCase(createBulkSavings.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      })
      // ── verify ───────────────────────────────────────────────
      .addCase(verifySavingsRecord.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(verifySavingsRecord.fulfilled, (state, { payload }) => {
        state.submitting = false;
        const mapped = mapSaving(payload);
        const index = state.savings.findIndex(s => s.id === mapped.id);
        if (index !== -1) state.savings[index] = { ...state.savings[index], ...mapped };
      })
      .addCase(verifySavingsRecord.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      })
      // ── delete ───────────────────────────────────────────────
      .addCase(deleteSavingsRecord.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteSavingsRecord.fulfilled, (state, { payload }) => {
        state.submitting = false;
        state.savings = state.savings.filter(s => s.id !== payload);
      })
      .addCase(deleteSavingsRecord.rejected, (state, { payload }) => {
        state.submitting = false;
        state.error = payload;
      });
  },
});

export const {
  setSavings,
  addSavings,
  updateSavings,
  verifySavings,
  deleteSavings,
  clearSavingsError,
  invalidateSavings,
  setLoading,
  setError,
} = savingsSlice.actions;

export default savingsSlice.reducer;
