import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeAll, describe, expect, it } from 'vitest';
import authReducer from '../store/slices/authSlice';
import groupReducer from '../store/slices/groupSlice';
import Layout from './Layout';

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const makeStore = (overrides = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      groups: groupReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 'u1', name: 'Test User', role: 'admin' },
        loading: false,
        initializing: false,
        error: null,
      },
      groups: {
        groups: [],
        selectedGroup: null,
        loading: false,
        error: null,
      },
      ...overrides,
    },
    middleware: (gDM) => gDM({ serializableCheck: false }),
  });

describe('Layout navigation', () => {
  it('renders HelpPage when Help nav button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<div>Dashboard Screen</div>} />
              <Route path="help" element={<div>Help Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Dashboard Screen')).toBeInTheDocument();

    const helpLinks = screen.getAllByRole('link', { name: 'Help' });
    await user.click(helpLinks[0]);

    await waitFor(() => {
      expect(screen.getByText('Help Screen')).toBeInTheDocument();
    });
  });

  it('shows user name and role from Redux state', () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders the logout button', () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<div>Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});
