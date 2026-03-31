import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

const makeStore = (authState) =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gDM) => gDM({ serializableCheck: false }),
    preloadedState: {
      auth: { user: null, loading: false, initializing: false, error: null, ...authState },
    },
  });

describe('RouteGuards', () => {
  it('redirects unauthenticated users from protected routes to login', () => {
    render(
      <Provider store={makeStore()}>
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
      </Provider>
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('allows authenticated users to access protected routes', () => {
    render(
      <Provider store={makeStore({ user: { id: 'u1', name: 'Test User' } })}>
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
      </Provider>
    );

    expect(screen.getByText('Groups Screen')).toBeInTheDocument();
  });

  it('redirects authenticated users away from login/signup to dashboard', () => {
    render(
      <Provider store={makeStore({ user: { id: 'u1', name: 'Test User' } })}>
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
      </Provider>
    );

    expect(screen.getByText('Dashboard Screen')).toBeInTheDocument();
  });
});
