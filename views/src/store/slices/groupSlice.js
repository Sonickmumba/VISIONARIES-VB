import { createSlice } from '@reduxjs/toolkit';

// Mock groups data
const mockGroups = [
  {
    id: '1',
    name: 'Lusaka Women Empowerment Group',
    description: 'A savings group for women entrepreneurs in Lusaka',
    leaderId: '1',
    leaderName: 'Grace Phiri',
    memberCount: 15,
    totalSavings: 1250000,
    createdAt: '2024-01-15',
    isActive: true,
  },
  {
    id: '2',
    name: 'Ndola Business Circle',
    description: 'Supporting small business owners in Ndola',
    leaderId: '2',
    leaderName: 'John Mwanza',
    memberCount: 12,
    totalSavings: 980000,
    createdAt: '2024-02-01',
    isActive: true,
  },
];

const initialState = {
  groups: mockGroups,
  selectedGroup: mockGroups[0],
  loading: false,
  error: null,
};

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action) => {
      state.groups = action.payload;
    },
    selectGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },
    addGroup: (state, action) => {
      state.groups.push(action.payload);
    },
    updateGroup: (state, action) => {
      const index = state.groups.findIndex(g => g.id === action.payload.id);
      if (index !== -1) {
        state.groups[index] = action.payload;
      }
      if (state.selectedGroup?.id === action.payload.id) {
        state.selectedGroup = action.payload;
      }
    },
    deleteGroup: (state, action) => {
      state.groups = state.groups.filter(g => g.id !== action.payload);
      if (state.selectedGroup?.id === action.payload) {
        state.selectedGroup = state.groups[0] || null;
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
  setGroups,
  selectGroup,
  addGroup,
  updateGroup,
  deleteGroup,
  setLoading,
  setError,
} = groupSlice.actions;

export default groupSlice.reducer;
