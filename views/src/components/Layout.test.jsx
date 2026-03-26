import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Layout from './Layout';
import { useAuthStore } from '../store/authStore';

describe('Layout navigation', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Test User', role: 'admin' },
      token: 'token-123',
    });
  });

  it('renders HelpPage when Help nav button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<div>Dashboard Screen</div>} />
            <Route path="help" element={<div>Help Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard Screen')).toBeInTheDocument();

    const helpLinks = screen.getAllByRole('link', { name: 'Help' });
    await user.click(helpLinks[0]);

    await waitFor(() => {
      expect(screen.getByText('Help Screen')).toBeInTheDocument();
    });
  });
});
