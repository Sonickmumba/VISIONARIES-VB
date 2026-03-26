import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

describe('RouteGuards', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('redirects unauthenticated users from protected routes to login', () => {
    render(
      <MemoryRouter
        initialEntries={['/groups']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/groups" element={<div>Groups Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('allows authenticated users to access protected routes', () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'Test User' }, token: 'token-123' });

    render(
      <MemoryRouter
        initialEntries={['/groups']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<div>Login Screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/groups" element={<div>Groups Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Groups Screen')).toBeInTheDocument();
  });

  it('redirects authenticated users away from login/signup to dashboard', () => {
    useAuthStore.setState({ user: { id: 'u1', name: 'Test User' }, token: 'token-123' });

    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Screen</div>} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<div>Login Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Screen')).toBeInTheDocument();
  });
});
