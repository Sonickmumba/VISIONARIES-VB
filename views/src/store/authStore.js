import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        const { data: res } = await axios.post('/api/auth/login', { email, password });
        const { user, token } = res.data;
        // Attach token to all future axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token });
        return user;
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      },

      // Rehydrate axios header after a page refresh
      initAuth: (token) => {
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'vb-auth',
      // Only persist user + token, not actions
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
