import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ── Async Thunks ─────────────────────────────────────────────────────────────

/** Fetch all groups (returns leader_name, member_count from backend) */
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get('/api/groups');
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load groups');
    }
  }
);

/** Fetch single group with members array */
export const fetchGroupById = createAsyncThunk(
  'groups/fetchGroupById',
  async (groupId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/groups/${groupId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load group');
    }
  }
);

/** Create a new group */
export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async ({ name, description, leaderId }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post('/api/groups', { name, description, leaderId });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create group');
    }
  }
);

/** Update an existing group */
export const updateGroupAsync = createAsyncThunk(
  'groups/updateGroup',
  async ({ id, name, description, leaderId }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.put(`/api/groups/${id}`, { name, description, leaderId });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update group');
    }
  }
);

/** Delete (soft-delete) a group */
export const deleteGroupAsync = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/groups/${groupId}`);
      return groupId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete group');
    }
  }
);

/** Add a member to a group */
export const addGroupMember = createAsyncThunk(
  'groups/addGroupMember',
  async ({ groupId, userId }, { rejectWithValue }) => {
    try {
      await axios.post(`/api/groups/${groupId}/members`, { userId });
      return { groupId, userId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to add member');
    }
  }
);

/** Remove a member from a group */
export const removeGroupMember = createAsyncThunk(
  'groups/removeGroupMember',
  async ({ groupId, userId }, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/groups/${groupId}/members/${userId}`);
      return { groupId, userId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to remove member');
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const groupSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: [],
    selectedGroup: null,
    loading: false,
    error: null,
  },
  reducers: {
    selectGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },
    clearGroupError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchGroups ────────────────────────────────────────────────────
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.groups = payload;
        // Auto-select first group if nothing selected yet
        if (!state.selectedGroup && payload.length > 0) {
          state.selectedGroup = payload[0];
        }
      })
      .addCase(fetchGroups.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── fetchGroupById ─────────────────────────────────────────────────
      .addCase(fetchGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.selectedGroup = payload;
      })
      .addCase(fetchGroupById.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // ── createGroup ────────────────────────────────────────────────────
      .addCase(createGroup.fulfilled, (state, { payload }) => {
        state.groups.push(payload);
      })
      // ── updateGroupAsync ───────────────────────────────────────────────
      .addCase(updateGroupAsync.fulfilled, (state, { payload }) => {
        const idx = state.groups.findIndex((g) => g.id === payload.id);
        if (idx !== -1) state.groups[idx] = { ...state.groups[idx], ...payload };
        if (state.selectedGroup?.id === payload.id) {
          state.selectedGroup = { ...state.selectedGroup, ...payload };
        }
      })
      // ── deleteGroupAsync ───────────────────────────────────────────────
      .addCase(deleteGroupAsync.fulfilled, (state, { payload: groupId }) => {
        state.groups = state.groups.filter((g) => g.id !== groupId);
        if (state.selectedGroup?.id === groupId) {
          state.selectedGroup = state.groups[0] || null;
        }
      });
  },
});

export const { selectGroup, clearGroupError } = groupSlice.actions;

export default groupSlice.reducer;
