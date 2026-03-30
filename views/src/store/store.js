import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import groupReducer from './slices/groupSlice';
import cycleReducer from './slices/cycleSlice';
import memberReducer from './slices/memberSlice';
import savingsReducer from './slices/savingsSlice';
import loanReducer from './slices/loanSlice';
import notificationReducer from './slices/notificationSlice';
import monthlyReportReducer from './slices/monthlyReportSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    cycles: cycleReducer,
    members: memberReducer,
    savings: savingsReducer,
    loans: loanReducer,
    notifications: notificationReducer,
    monthlyReport: monthlyReportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
