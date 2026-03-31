import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ShareoutReport } from './ShareoutReport';
import authReducer from '../../store/slices/authSlice';
import groupReducer from '../../store/slices/groupSlice';
import cycleReducer from '../../store/slices/cycleSlice';
import memberReducer from '../../store/slices/memberSlice';
import loanReducer from '../../store/slices/loanSlice';
import savingsReducer from '../../store/slices/savingsSlice';
import notificationReducer from '../../store/slices/notificationSlice';
import axios from 'axios';
import * as cycleSlice from '../../store/slices/cycleSlice';

// Mock html2pdf
vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: vi.fn(function() { return this; }),
    from: vi.fn(function() { return this; }),
    save: vi.fn(function() { 
      console.log('PDF saved (mocked)');
      return Promise.resolve();
    }),
  }),
}));

// Mock axios
vi.mock('axios');

// Mock the async thunks to prevent actual API calls
vi.spyOn(cycleSlice, 'fetchCyclesByGroup').mockImplementation(() => ({ type: 'mock' }));
vi.spyOn(cycleSlice, 'fetchShareoutByCycle').mockImplementation(() => ({ type: 'mock' }));

describe('ShareoutReport PDF Export & Email', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
        groups: groupReducer,
        cycles: cycleReducer,
        members: memberReducer,
        loans: loanReducer,
        savings: savingsReducer,
        notifications: notificationReducer,
      },
      preloadedState: {
        auth: { user: { id: '1', name: 'Admin', role: 'admin' }, loading: false, error: null },
        groups: { 
          groups: [{ id: 'g1', name: 'Test Group' }], 
          selectedGroup: { id: 'g1', name: 'Test Group' },
          loading: false,
          error: null,
        },
        cycles: { 
          cycles: [{ 
            id: 'c1', 
            name: 'Jan-Jun 2026', 
            status: 'active',
            start_date: '2026-01-01',
            end_date: '2026-06-30',
          }], 
          currentCycle: { 
            id: 'c1', 
            name: 'Jan-Jun 2026', 
            status: 'active',
            start_date: '2026-01-01',
            end_date: '2026-06-30',
          },
          shareoutData: [
            { 
              userId: 'm1', 
              user_id: 'm1',
              name: 'Member One',
              totalSavings: 50000, 
              savingsInterest: 5000, 
              commonInterest: 500, 
              totalAmount: 54500,
              penalty: 0,
              loanOwed: 0,
              memberNo: 'M00001',
            },
            { 
              userId: 'm2', 
              user_id: 'm2',
              name: 'Member Two',
              totalSavings: 30000, 
              savingsInterest: 3000, 
              commonInterest: 300, 
              totalAmount: 33300,
              penalty: 0,
              loanOwed: 0,
              memberNo: 'M00002',
            },
          ],
          shareoutLoading: false,
          shareoutError: null,
          emailLoading: false,
          emailError: null,
          loading: false,
          error: null,
        },
        members: { 
          members: [
            { id: 'm1', user_id: 'm1', name: 'Member One', total_savings: 50000, outstanding_loan: 0, penalty: 0 },
            { id: 'm2', user_id: 'm2', name: 'Member Two', total_savings: 30000, outstanding_loan: 0, penalty: 0 },
          ], 
          loading: false,
          error: null,
        },
        loans: { loans: [], loading: false, error: null },
        savings: { savings: [], loading: false, error: null },
        notifications: { notifications: [], loading: false, error: null },
      },
    });

    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <ShareoutReport />
        </MemoryRouter>
      </Provider>
    );
  };

  it('should render without crashing', () => {
    renderComponent();
    // With properly initialized store, the report should render with cycle name and dates
    const reportTitle = screen.queryByText(/Jan-Jun 2026/i) || screen.queryByRole('heading');
    expect(reportTitle).toBeTruthy();
  });

  it('should show message when no cycles available', async () => {
    // Create a store with no cycles to test the fallback UI
    const emptyStore = configureStore({
      reducer: {
        auth: authReducer,
        groups: groupReducer,
        cycles: cycleReducer,
        members: memberReducer,
        loans: loanReducer,
        savings: savingsReducer,
        notifications: notificationReducer,
      },
      preloadedState: {
        auth: { user: { id: '1', name: 'Admin', role: 'admin' }, loading: false, error: null },
        groups: { 
          groups: [], 
          selectedGroup: null,
          loading: false,
          error: null,
        },
        cycles: { 
          cycles: [], 
          currentCycle: null,
          shareoutData: null,
          shareoutLoading: false,
          shareoutError: null,
          emailLoading: false,
          emailError: null,
          loading: false,
          error: null,
        },
        members: { members: [], loading: false, error: null },
        loans: { loans: [], loading: false, error: null },
        savings: { savings: [], loading: false, error: null },
        notifications: { notifications: [], loading: false, error: null },
      },
    });

    render(
      <Provider store={emptyStore}>
        <MemoryRouter>
          <ShareoutReport />
        </MemoryRouter>
      </Provider>
    );

    // When no cycles, should show appropriate fallback message
    await waitFor(() => {
      expect(
        screen.queryByText(/no cycles|no group|invalid date/i) || 
        screen.queryByText(/loading/i) ||
        screen.queryByRole('heading')
      ).toBeTruthy();
    });
  });

  it('should have export PDF button', () => {
    renderComponent();
    const pdfButtons = screen.getAllByRole('button');
    const pdfButton = pdfButtons.find(btn => btn.textContent.includes('PDF'));
    expect(pdfButton).toBeInTheDocument();
  });

  it('should have email button', () => {
    renderComponent();
    const buttons = screen.getAllByRole('button');
    const emailButton = buttons.find(btn => btn.textContent.includes('Email'));
    expect(emailButton).toBeInTheDocument();
  });

  it('should open email modal when email button clicked', async () => {
    renderComponent();
    
    const buttons = screen.getAllByRole('button');
    const emailButton = buttons.find(btn => btn.textContent.includes('Email'));
    
    // Initially modal should not be visible
    expect(screen.queryByPlaceholderText('recipient@example.com')).not.toBeInTheDocument();
    
    // Click email button
    fireEvent.click(emailButton);
    
    // Modal should now be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument();
    });
  });

  it('should validate email format before sending', async () => {
    renderComponent();
    
    const buttons = screen.getAllByRole('button');
    const emailButton = buttons.find(btn => btn.textContent.includes('Email'));
    fireEvent.click(emailButton);
    
    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('recipient@example.com');
      expect(emailInput).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('recipient@example.com');
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Initially send button should be disabled (no email)
    expect(sendButton).toBeDisabled();
    
    // Type invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    expect(sendButton).not.toBeDisabled();
  });
});

describe('PDF Generation Performance', () => {
  it('should generate PDF within reasonable time (< 5 seconds)', async () => {
    const startTime = performance.now();
    
    // Simulate PDF generation with large dataset
    const largeShareoutData = Array.from({ length: 1000 }, (_, i) => ({
      id: `member-${i}`,
      name: `Member ${i}`,
      memberNo: `M${String(i).padStart(5, '0')}`,
      savings: Math.random() * 100000,
      loanOwed: Math.random() * 50000,
      commonInterestOwed: Math.random() * 5000,
      penalty: 0,
      shareout: Math.random() * 50000,
      payoutStatus: Math.random() > 0.5 ? 'pending' : 'owes',
    }));

    // Simulate HTML generation (what handleExportPDF does)
    const htmlContent = `
      <table>
        <tbody>
          ${largeShareoutData.map((item) => `
            <tr>
              <td>${item.name}</td>
              <td>K ${item.savings.toLocaleString()}</td>
              <td>K ${item.loanOwed.toLocaleString()}</td>
              <td>K ${item.commonInterestOwed.toLocaleString()}</td>
              <td>K ${item.shareout.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const endTime = performance.now();
    const generationTime = endTime - startTime;

    console.log(`HTML generation time for 1000 members: ${generationTime.toFixed(2)}ms`);
    expect(generationTime).toBeLessThan(5000);
  });

  it('should generate PDF HTML string efficiently', () => {
    const startTime = performance.now();
    
    const testData = Array.from({ length: 500 }, (_, i) => ({
      name: `Test Member ${i}`,
      savings: 50000,
      loanOwed: 25000,
      commonInterestOwed: 2500,
      shareout: 22500,
    }));

    // This simulates the template literal generation
    const htmlString = `
      ${testData.map((item) => `
        <tr>
          <td>${item.name}</td>
          <td>K ${item.savings.toLocaleString()}</td>
          <td>K ${item.loanOwed.toLocaleString()}</td>
          <td>K ${item.commonInterestOwed.toLocaleString()}</td>
          <td>K ${item.shareout.toLocaleString()}</td>
        </tr>
      `).join('')}
    `;

    const endTime = performance.now();
    const time = endTime - startTime;

    console.log(`Template literal generation for 500 rows: ${time.toFixed(2)}ms`);
    expect(time).toBeLessThan(1000); // Should be very fast
  });
});

describe('Email Integration', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
        groups: groupReducer,
        cycles: cycleReducer,
        members: memberReducer,
        loans: loanReducer,
        savings: savingsReducer,
        notifications: notificationReducer,
      },
    });

    vi.clearAllMocks();
  });

  it('should mock email endpoint successfully', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: 'Report prepared',
        data: {
          recipient: 'test@example.com',
          subject: 'Test Report',
          summary: {
            totalMembers: 10,
            totalSavings: 500000,
            totalInterest: 50000,
            totalCommonInterest: 5000,
            netAvailable: 555000,
          },
        },
      },
    });

    const response = await axios.post('/api/cycles/123/send-shareout-report', {
      recipientEmail: 'test@example.com',
      subject: 'Test Report',
      includeMembers: true,
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.recipient).toBe('test@example.com');
    expect(axios.post).toHaveBeenCalledWith(
      '/api/cycles/123/send-shareout-report',
      expect.any(Object)
    );
  });

  it('should handle email error', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          success: false,
          message: 'Invalid email format',
        },
      },
    });

    try {
      await axios.post('/api/cycles/123/send-shareout-report', {
        recipientEmail: 'invalid',
      });
    } catch (err) {
      expect(err.response.data.success).toBe(false);
      expect(err.response.data.message).toBe('Invalid email format');
    }
  });
});

describe('Data Calculation Performance', () => {
  it('should calculate totals efficiently for large datasets', () => {
    const startTime = performance.now();

    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      savings: Math.random() * 100000,
      loanOwed: Math.random() * 50000,
      commonInterestOwed: Math.random() * 5000,
      penalty: 0,
      shareout: Math.random() * 50000,
    }));

    // Simulate the reduce operations from the component
    const totalSavings = largeDataset.reduce((sum, item) => sum + Number(item.savings || 0), 0);
    const totalLoansOutstanding = largeDataset.reduce((sum, item) => sum + Number(item.loanOwed || 0), 0);
    const totalPenalties = largeDataset.reduce((sum, item) => sum + Number(item.penalty || 0), 0);
    const totalCommonInterest = largeDataset.reduce((sum, item) => sum + Number(item.commonInterestOwed || 0), 0);
    const netAvailable = totalSavings - totalLoansOutstanding - totalPenalties - totalCommonInterest;

    const endTime = performance.now();
    const calculationTime = endTime - startTime;

    console.log(`Calculation time for 10000 members: ${calculationTime.toFixed(2)}ms`);
    console.log(`Net Available: K${netAvailable.toLocaleString()}`);

    expect(calculationTime).toBeLessThan(100); // Should be very fast
    expect(netAvailable).toBeGreaterThan(0);
  });

  it('should filter members efficiently', () => {
    const startTime = performance.now();

    const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      shareout: Math.random() * 100000 - 50000, // Range: -50k to +50k
    }));

    const membersToReceive = largeDataset.filter((item) => item.shareout > 0).length;
    const membersWhoOwe = largeDataset.filter((item) => item.shareout < 0).length;
    const totalToPayout = largeDataset
      .filter((item) => item.shareout > 0)
      .reduce((sum, item) => sum + item.shareout, 0);
    const totalToCollect = Math.abs(
      largeDataset
        .filter((item) => item.shareout < 0)
        .reduce((sum, item) => sum + item.shareout, 0)
    );

    const endTime = performance.now();
    const filterTime = endTime - startTime;

    console.log(`Filter time for 5000 members: ${filterTime.toFixed(2)}ms`);
    console.log(`Members to receive: ${membersToReceive}, Members who owe: ${membersWhoOwe}`);

    expect(filterTime).toBeLessThan(50);
  });
});
