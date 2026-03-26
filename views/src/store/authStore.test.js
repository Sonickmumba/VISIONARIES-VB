import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

describe('useAuthStore logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null });
    delete axios.defaults.headers.common.Authorization;
  });

  it('calls backend logout and clears auth state', async () => {
    axios.post.mockResolvedValue({ data: { success: true } });

    useAuthStore.setState({
      user: { id: 'u1', name: 'Test User' },
      token: 'token-123',
    });
    axios.defaults.headers.common.Authorization = 'Bearer token-123';

    await useAuthStore.getState().logout();

    expect(axios.post).toHaveBeenCalledWith('/api/auth/logout');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(axios.defaults.headers.common.Authorization).toBeUndefined();
  });

  it('still clears local auth state when backend logout fails', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));

    useAuthStore.setState({
      user: { id: 'u1', name: 'Test User' },
      token: 'token-123',
    });
    axios.defaults.headers.common.Authorization = 'Bearer token-123';

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(axios.defaults.headers.common.Authorization).toBeUndefined();
  });
});
