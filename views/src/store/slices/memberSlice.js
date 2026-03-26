import { createSlice } from '@reduxjs/toolkit';

const memberSlice = createSlice({
  name: 'members',
  initialState: {
    members: [],
    loading: false,
    error: null,
  },
  reducers: {
    setMembers(state, action) {
      state.members = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
  },
});

export const { setMembers, setLoading, setError } = memberSlice.actions;
export default memberSlice.reducer;
