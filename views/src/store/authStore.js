import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export const useAuthStore = create(
  persist(
    (set, get) => ({
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

      logout: async () => {
        let logoutError = null;
        try {
          if (get().token) {
            await axios.post('/api/auth/logout');
          }
        } catch (error) {
          logoutError = error;
        } finally {
          delete axios.defaults.headers.common['Authorization'];
          set({ user: null, token: null });
        }

        return { success: !logoutError, error: logoutError };
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
