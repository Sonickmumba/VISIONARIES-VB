/** Approve or reject a loan */
export const approveLoan = createAsyncThunk(
  'loans/approveLoan',
  async ({ id, notes }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/loans/${id}/approve`, { status: 'approved', notes });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to approve loan');
    }
  }
);

/** Disburse a loan */
export const disburseLoan = createAsyncThunk(
  'loans/disburseLoan',
  async ({ id, disbursedDate }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/loans/${id}/disburse`, { disbursedDate });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to disburse loan');
    }
  }
);

/** Verify or reject a repayment */
export const verifyRepayment = createAsyncThunk(
  'loans/verifyRepayment',
  async ({ loanId, repaymentId, status, verifiedBy, verifiedAt }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/loans/${loanId}/verify-repayment/${repaymentId}`, { status, verifiedBy, verifiedAt });
      return { loanId, repayment: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to verify repayment');
    }
  }
);

/** Update a loan (e.g., reject) */
export const updateLoan = createAsyncThunk(
  'loans/updateLoan',
  async (payload, { rejectWithValue }) => {
    try {
      const { id, ...rest } = payload;
      const { data: res } = await axios.put(`/api/loans/${id}`, rest);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update loan');
    }
  }
);
// ── Repay Loan Thunk ───────────────────────────────────────────────────────
/** Submit a loan repayment */
export const repayLoan = createAsyncThunk(
  'loans/repayLoan',
  async ({ loanId, amount, proofUrl = '', notes = '' }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post(`/api/loans/${loanId}/repay`, {
        amount,
        proofUrl,
        notes,
      });
      return { loanId, repayment: res.data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to submit repayment'
      );
    }
  }
);
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ── Async Thunks ───────

/** Fetch all loans (admin/cycle view) */
export const fetchLoans = createAsyncThunk(
  'loans/fetchLoans',
  async (cycleId, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.get(`/api/loans/cycle/${cycleId}`);
      return res.data; // array of loan objects
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to load loans'
      );
    }
  }
);

/** Create a new loan (disbursement) */
export const createLoan = createAsyncThunk(
  'loans/createLoan',
  async ({ cycleId, userId, amount, purpose, memberName }, { rejectWithValue }) => {
    try {
      const { data: res } = await axios.post('/api/loans', { cycleId, userId, amount, purpose, memberName });
      return res.data; // loan object
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Failed to create loan'
      );
    }
  }
);

// ── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  loans: [],
  selectedLoan: null,
  loading: false,
  error: null,
  stale: true,
};

// ── Slice ────────────────────────────────────────────────────────────────────
const loanSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    setLoans: (state, action) => {
      state.loans = action.payload;
    },
    setSelectedLoan: (state, action) => {
      state.selectedLoan = action.payload;
    },
    clearLoanError: (state) => {
      state.error = null;
    },
    invalidateLoans: (state) => {
      state.stale = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLoans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLoans.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.stale = false;
        // Map backend loan data to frontend structure
        state.loans = payload.map(loan => ({
          id: loan.id,
          memberId: loan.user_id || loan.member_id || '',
          memberName: loan.member_name || loan.memberName || '',
          cycleId: loan.cycle_id,
          amount: Number(loan.amount),
          interestAmount: Number(loan.interest_amount),
          totalAmount: Number(loan.total_amount),
          amountRepaid: Number(loan.amount_repaid),
          balance: loan.balance !== undefined ? Number(loan.balance) : (Number(loan.total_amount) - Number(loan.amount_repaid)),
          purpose: loan.purpose || '',
          status: loan.status,
          requestedDate: loan.requested_date || loan.created_at || null,
          approvedDate: loan.approved_date || null,
          disbursedDate: loan.disbursed_date || null,
          dueDate: loan.due_date || null,
          repayments: loan.repayments || [],
          notes: loan.notes || '',
        }));
      })
      .addCase(fetchLoans.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(createLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.loans.push(payload);
      })
      .addCase(createLoan.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(repayLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(repayLoan.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Optionally update the loan's repayments in state if needed
      })
      .addCase(repayLoan.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Approve Loan
      .addCase(approveLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveLoan.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.loans.findIndex(l => l.id === payload.id);
        if (idx !== -1) {
          // Preserve mapped fields and merge with updated backend data
          const existing = state.loans[idx];
          state.loans[idx] = {
            ...existing,
            ...payload,
            memberId: payload.user_id || existing.memberId,
            memberName: payload.member_name || existing.memberName,
            status: payload.status,
            approvedDate: payload.approved_date || existing.approvedDate,
            notes: payload.notes || existing.notes,
          };
        }
      })
      .addCase(approveLoan.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Disburse Loan
      .addCase(disburseLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disburseLoan.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.loans.findIndex(l => l.id === payload.id);
        if (idx !== -1) {
          // Preserve mapped fields and merge with updated backend data
          const existing = state.loans[idx];
          state.loans[idx] = {
            ...existing,
            ...payload,
            memberId: payload.user_id || existing.memberId,
            memberName: payload.member_name || existing.memberName,
            status: payload.status,
            disbursedDate: payload.disbursed_date || existing.disbursedDate,
            dueDate: payload.due_date || existing.dueDate,
          };
        }
      })
      .addCase(disburseLoan.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Verify Repayment
      .addCase(verifyRepayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyRepayment.fulfilled, (state, { payload }) => {
        state.loading = false;
        const { loanId, repayment } = payload;
        const loan = state.loans.find(l => l.id === loanId);
        if (loan && Array.isArray(loan.repayments)) {
          const repIdx = loan.repayments.findIndex(r => r.id === repayment.id);
          if (repIdx !== -1) loan.repayments[repIdx] = repayment;
        }
      })
      .addCase(verifyRepayment.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      // Update Loan
      .addCase(updateLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLoan.fulfilled, (state, { payload }) => {
        state.loading = false;
        const idx = state.loans.findIndex(l => l.id === payload.id);
        if (idx !== -1) state.loans[idx] = payload;
      })
      .addCase(updateLoan.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { setLoans, setSelectedLoan, clearLoanError, invalidateLoans } = loanSlice.actions;
export default loanSlice.reducer;
