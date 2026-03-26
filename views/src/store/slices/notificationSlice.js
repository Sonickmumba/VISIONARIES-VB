import { createSlice } from '@reduxjs/toolkit';

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    type: 'payment_due',
    title: 'Payment Due',
    message: 'Grace Phiri has a loan repayment due in 5 days',
    read: false,
    date: '2024-03-20T10:30:00',
  },
  {
    id: '2',
    type: 'payment_verified',
    title: 'Payment Verified',
    message: 'Mary Banda\'s savings of K30,000 has been verified',
    read: false,
    date: '2024-03-19T14:15:00',
  },
  {
    id: '3',
    type: 'loan_request',
    title: 'New Loan Request',
    message: 'David Zulu has requested a loan of K50,000',
    read: true,
    date: '2024-03-18T09:20:00',
  },
];

const initialState = {
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter(n => !n.read).length,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    deleteNotification: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
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
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  setLoading,
  setError,
} = notificationSlice.actions;

export default notificationSlice.reducer;
