import { createSlice } from '@reduxjs/toolkit';

// Mock loans data
const mockLoans = [
  {
    id: '1',
    memberId: '1',
    memberName: 'Grace Phiri',
    cycleId: '1',
    amount: 50000,
    interestAmount: 5000,
    totalAmount: 55000,
    amountRepaid: 30000,
    balance: 25000,
    purpose: 'Business expansion',
    status: 'disbursed',
    requestedDate: '2024-02-01',
    approvedDate: '2024-02-02',
    disbursedDate: '2024-02-03',
    dueDate: '2024-06-30',
    repayments: [
      {
        id: 'r1',
        amount: 30000,
        paymentDate: '2024-03-01',
        status: 'verified',
        verifiedBy: 'Admin User',
        verifiedAt: '2024-03-02',
      },
    ],
  },
  {
    id: '2',
    memberId: '2',
    memberName: 'Mary Banda',
    cycleId: '1',
    amount: 30000,
    interestAmount: 3000,
    totalAmount: 33000,
    amountRepaid: 33000,
    balance: 0,
    purpose: 'School fees',
    status: 'repaid',
    requestedDate: '2024-01-15',
    approvedDate: '2024-01-16',
    disbursedDate: '2024-01-17',
    dueDate: '2024-05-31',
    repaymentDate: '2024-03-15',
    repayments: [
      {
        id: 'r2',
        amount: 33000,
        paymentDate: '2024-03-15',
        status: 'verified',
        verifiedBy: 'Admin User',
        verifiedAt: '2024-03-16',
      },
    ],
  },
  {
    id: '3',
    memberId: '3',
    memberName: 'David Zulu',
    cycleId: '1',
    amount: 75000,
    interestAmount: 7500,
    totalAmount: 82500,
    amountRepaid: 42500,
    balance: 40000,
    purpose: 'Agricultural equipment',
    status: 'disbursed',
    requestedDate: '2024-02-10',
    approvedDate: '2024-02-11',
    disbursedDate: '2024-02-12',
    dueDate: '2024-07-31',
    repayments: [
      {
        id: 'r3',
        amount: 42500,
        paymentDate: '2024-03-10',
        status: 'verified',
        verifiedBy: 'Admin User',
        verifiedAt: '2024-03-11',
      },
    ],
  },
  {
    id: '4',
    memberId: '5',
    memberName: 'John Tembo',
    cycleId: '1',
    amount: 20000,
    interestAmount: 3000,
    totalAmount: 23000,
    amountRepaid: 3000,
    balance: 20000,
    purpose: 'Small business',
    status: 'disbursed',
    requestedDate: '2024-03-01',
    approvedDate: '2024-03-02',
    disbursedDate: '2024-03-03',
    dueDate: '2024-08-31',
    repayments: [
      {
        id: 'r4',
        amount: 3000,
        paymentDate: '2024-03-20',
        status: 'verified',
        verifiedBy: 'Admin User',
        verifiedAt: '2024-03-21',
      },
    ],
  },
];

const initialState = {
  loans: mockLoans,
  selectedLoan: null,
  loading: false,
  error: null,
};

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
    addLoan: (state, action) => {
      state.loans.push(action.payload);
    },
    updateLoan: (state, action) => {
      const index = state.loans.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.loans[index] = action.payload;
      }
      if (state.selectedLoan?.id === action.payload.id) {
        state.selectedLoan = action.payload;
      }
    },
    approveLoan: (state, action) => {
      const { id, approvedDate } = action.payload;
      const index = state.loans.findIndex(l => l.id === id);
      if (index !== -1) {
        state.loans[index].status = 'approved';
        state.loans[index].approvedDate = approvedDate;
      }
    },
    disburseLoan: (state, action) => {
      const { id, disbursedDate } = action.payload;
      const index = state.loans.findIndex(l => l.id === id);
      if (index !== -1) {
        state.loans[index].status = 'disbursed';
        state.loans[index].disbursedDate = disbursedDate;
      }
    },
    addRepayment: (state, action) => {
      const { loanId, repayment } = action.payload;
      const index = state.loans.findIndex(l => l.id === loanId);
      if (index !== -1) {
        if (!state.loans[index].repayments) {
          state.loans[index].repayments = [];
        }
        state.loans[index].repayments.push(repayment);
        state.loans[index].amountRepaid += repayment.amount;
        state.loans[index].balance = state.loans[index].totalAmount - state.loans[index].amountRepaid;
        
        // Mark as repaid if fully paid
        if (state.loans[index].balance <= 0) {
          state.loans[index].status = 'repaid';
          state.loans[index].repaymentDate = repayment.paymentDate;
        }
      }
    },
    verifyRepayment: (state, action) => {
      const { loanId, repaymentId, status, verifiedBy, verifiedAt } = action.payload;
      const loanIndex = state.loans.findIndex(l => l.id === loanId);
      if (loanIndex !== -1) {
        const repaymentIndex = state.loans[loanIndex].repayments.findIndex(r => r.id === repaymentId);
        if (repaymentIndex !== -1) {
          state.loans[loanIndex].repayments[repaymentIndex].status = status;
          state.loans[loanIndex].repayments[repaymentIndex].verifiedBy = verifiedBy;
          state.loans[loanIndex].repayments[repaymentIndex].verifiedAt = verifiedAt;
        }
      }
    },
    deleteLoan: (state, action) => {
      state.loans = state.loans.filter(l => l.id !== action.payload);
      if (state.selectedLoan?.id === action.payload) {
        state.selectedLoan = null;
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
  setLoans,
  setSelectedLoan,
  addLoan,
  updateLoan,
  approveLoan,
  disburseLoan,
  addRepayment,
  verifyRepayment,
  deleteLoan,
  setLoading,
  setError,
} = loanSlice.actions;

export default loanSlice.reducer;
