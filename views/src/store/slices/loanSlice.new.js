// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import axios from 'axios';

// // ── Async Thunks ─────────────────────────────────────────────────────────────

// /** Fetch all loans (admin/cycle view) */
// export const fetchLoans = createAsyncThunk(
//   'loans/fetchLoans',
//   async (cycleId, { rejectWithValue }) => {
//     try {
//       const { data: res } = await axios.get(`/api/loans/cycle/${cycleId}`);
//       return res.data; // array of loan objects
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data?.message || 'Failed to load loans'
//       );
//     }
//   }
// );

// /** Create a new loan (disbursement) */
// export const createLoan = createAsyncThunk(
//   'loans/createLoan',
//   async ({ cycleId, amount, purpose }, { rejectWithValue }) => {
//     try {
//       const { data: res } = await axios.post('/api/loans', { cycleId, amount, purpose });
//       return res.data; // loan object
//     } catch (err) {
//       return rejectWithValue(
//         err.response?.data?.message || 'Failed to create loan'
//       );
//     }
//   }
// );

// // ── Initial State ────────────────────────────────────────────────────────────
// const initialState = {
//   loans: [],
//   selectedLoan: null,
//   loading: false,
//   error: null,
// };

// // ── Slice ────────────────────────────────────────────────────────────────────
// const loanSlice = createSlice({
//   name: 'loans',
//   initialState,
//   reducers: {
//     setLoans: (state, action) => {
//       state.loans = action.payload;
//     },
//     setSelectedLoan: (state, action) => {
//       state.selectedLoan = action.payload;
//     },
//     clearLoanError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchLoans.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(fetchLoans.fulfilled, (state, { payload }) => {
//         state.loading = false;
//         state.loans = payload;
//       })
//       .addCase(fetchLoans.rejected, (state, { payload }) => {
//         state.loading = false;
//         state.error = payload;
//       })
//       .addCase(createLoan.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(createLoan.fulfilled, (state, { payload }) => {
//         state.loading = false;
//         state.loans.push(payload);
//       })
//       .addCase(createLoan.rejected, (state, { payload }) => {
//         state.loading = false;
//         state.error = payload;
//       });
//   },
// });

// export const { setLoans, setSelectedLoan, clearLoanError } = loanSlice.actions;
// export default loanSlice.reducer;
// export { fetchLoans, createLoan };
