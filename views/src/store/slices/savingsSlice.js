import { createSlice } from '@reduxjs/toolkit';

// Mock savings data
const mockSavings = [
  {
    id: '1',
    memberId: '1',
    memberName: 'Grace Phiri',
    cycleId: '1',
    amount: 30000,
    month: 1,
    year: 2024,
    status: 'verified',
    paymentDate: '2024-01-05',
    proofUrl: null,
    verifiedBy: 'Admin User',
    verifiedAt: '2024-01-06',
  },
  {
    id: '2',
    memberId: '2',
    memberName: 'Mary Banda',
    cycleId: '1',
    amount: 25000,
    month: 1,
    year: 2024,
    status: 'verified',
    paymentDate: '2024-01-05',
    proofUrl: null,
    verifiedBy: 'Admin User',
    verifiedAt: '2024-01-06',
  },
  {
    id: '3',
    memberId: '1',
    memberName: 'Grace Phiri',
    cycleId: '1',
    amount: 30000,
    month: 2,
    year: 2024,
    status: 'pending',
    paymentDate: '2024-02-05',
    proofUrl: null,
    verifiedBy: null,
    verifiedAt: null,
  },
];

const initialState = {
  savings: mockSavings,
  loading: false,
  error: null,
};

const savingsSlice = createSlice({
  name: 'savings',
  initialState,
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
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setSavings,
  addSavings,
  updateSavings,
  verifySavings,
  deleteSavings,
  setLoading,
  setError,
} = savingsSlice.actions;

export default savingsSlice.reducer;
