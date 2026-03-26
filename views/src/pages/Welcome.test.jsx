import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeAll } from 'vitest';
import { Welcome } from './Welcome';

// jsdom doesn't ship IntersectionObserver (used by framer-motion whileInView)
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Minimal store — Welcome doesn't read any Redux state,
// but the Provider is required since main.jsx wraps the whole app.
const makeStore = () =>
  configureStore({
    reducer: { auth: () => ({ user: null, loading: false, initializing: false, error: null }) },
    middleware: (gDM) => gDM({ serializableCheck: false }),
  });

const renderWelcome = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>
    </Provider>
  );

describe('Welcome page', () => {
  it('renders the brand name', () => {
    renderWelcome();
    const matches = screen.getAllByText('VISIONARIES VB');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the hero heading', () => {
    renderWelcome();
    expect(screen.getByText('Digital Village Banking')).toBeInTheDocument();
    expect(screen.getByText('Made Simple & Secure')).toBeInTheDocument();
  });

  it('renders all six feature cards', () => {
    renderWelcome();
    const titles = [
      'Member Management',
      'Savings Tracking',
      'Loan Processing',
      'Smart Reports',
      'Real-time Notifications',
      'Secure & Verified',
    ];
    titles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('renders Get Started and Login links', () => {
    renderWelcome();
    const getStartedLinks = screen.getAllByRole('link', { name: /get started/i });
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /member login/i })).toBeInTheDocument();
  });

  it('renders the CTA section', () => {
    renderWelcome();
    expect(screen.getByText('Ready to Transform Your Village Banking?')).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderWelcome();
    expect(screen.getByText(/© 2026 VISIONARIES VB/)).toBeInTheDocument();
  });
});
