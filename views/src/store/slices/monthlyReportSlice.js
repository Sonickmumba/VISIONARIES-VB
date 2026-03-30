import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks for monthly report operations
export const fetchMonthlyReport = createAsyncThunk(
  'monthlyReport/fetchMonthlyReport',
  async ({ year, month, cycleId }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (cycleId) params.append('cycleId', cycleId);

      const response = await axios.get(`/api/reports/monthly/${year}/${month}?${params}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch monthly report');
    }
  }
);

export const sendMonthlyReportEmail = createAsyncThunk(
  'monthlyReport/sendMonthlyReportEmail',
  async ({ year, month, emailData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/reports/monthly/${year}/${month}/send-email`, emailData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send monthly report');
    }
  }
);

const initialState = {
  reportData: null,
  loading: false,
  error: null,
  emailLoading: false,
  emailError: null,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1, // 1-based month
};

const monthlyReportSlice = createSlice({
  name: 'monthlyReport',
  initialState,
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedYear = action.payload.year;
      state.selectedMonth = action.payload.month;
    },
    clearReportData: (state) => {
      state.reportData = null;
      state.error = null;
    },
    clearEmailError: (state) => {
      state.emailError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch monthly report
      .addCase(fetchMonthlyReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reportData = action.payload;
        state.error = null;
      })
      .addCase(fetchMonthlyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.reportData = null;
      })
      // Send monthly report email
      .addCase(sendMonthlyReportEmail.pending, (state) => {
        state.emailLoading = true;
        state.emailError = null;
      })
      .addCase(sendMonthlyReportEmail.fulfilled, (state, action) => {
        state.emailLoading = false;
        state.emailError = null;
      })
      .addCase(sendMonthlyReportEmail.rejected, (state, action) => {
        state.emailLoading = false;
        state.emailError = action.payload;
      });
  },
});

export const { setSelectedPeriod, clearReportData, clearEmailError } = monthlyReportSlice.actions;

// Selectors
export const selectMonthlyReportData = (state) => state.monthlyReport.reportData;
export const selectMonthlyReportLoading = (state) => state.monthlyReport.loading;
export const selectMonthlyReportError = (state) => state.monthlyReport.error;
export const selectMonthlyReportEmailLoading = (state) => state.monthlyReport.emailLoading;
export const selectMonthlyReportEmailError = (state) => state.monthlyReport.emailError;
export const selectSelectedPeriod = createSelector(
  [(state) => state.monthlyReport.selectedYear, (state) => state.monthlyReport.selectedMonth],
  (year, month) => ({ year, month })
);

export default monthlyReportSlice.reducer;