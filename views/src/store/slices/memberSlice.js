import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ── Async Thunks ─────────────────────────────────────────────────────────────

/** Fetch all members (admin-only list endpoint) */
export const fetchMembers = createAsyncThunk(
  'members/fetchMembers',
  async (_, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get('/api/users');
      return res.data; // array of user rows
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load members'
      );
    }
  }
);

/** Fetch detailed member profile with financial summary */
export const fetchMemberDetails = createAsyncThunk(
  'members/fetchMemberDetails',
  async (memberId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/users/${memberId}/details`);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load member details'
      );
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const memberSlice = createSlice({
  name: 'members',
  initialState: {
    members: [],
    selectedMember: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearMemberError(state) {
      state.error = null;
    },
    clearSelectedMember(state) {
      state.selectedMember = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchMembers ───────────────────────────────────────────────────
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.members = payload;
      })
      .addCase(fetchMembers.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── fetchMemberDetails ─────────────────────────────────────────────
      .addCase(fetchMemberDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemberDetails.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.selectedMember = payload;
      })
      .addCase(fetchMemberDetails.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { clearMemberError, clearSelectedMember } = memberSlice.actions;
export default memberSlice.reducer;