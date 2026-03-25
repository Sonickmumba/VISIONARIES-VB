jest.mock('../config/database', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

jest.mock('../utils/audit.util', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/notification.util', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/interest.util', () => ({
  calculateLoanInterest: jest.fn(),
}));

const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createNotification } = require('../utils/notification.util');
const { calculateLoanInterest } = require('../utils/interest.util');
const loanController = require('../controllers/loanController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('loanController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createLoan returns 404 when cycle does not exist', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: { cycleId: 'cycle-1', amount: 5000, purpose: 'Business' },
      user: { id: 'user-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await loanController.createLoan(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cycle not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('createLoan returns 201 and notifies admins on success', async () => {
    calculateLoanInterest.mockReturnValue(3000);

    const createdLoan = {
      id: 'loan-1',
      cycle_id: 'cycle-1',
      user_id: 'user-1',
      amount: 5000,
      interest_amount: 3000,
      total_amount: 8000,
      status: 'pending',
    };

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', status: 'active' }] })
        .mockResolvedValueOnce({ rows: [createdLoan] })
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }, { id: 'admin-2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: { cycleId: 'cycle-1', amount: 5000, purpose: 'Business' },
      user: { id: 'user-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await loanController.createLoan(req, res);

    expect(calculateLoanInterest).toHaveBeenCalledWith(5000);
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Loan application submitted successfully',
      data: createdLoan,
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('approveLoan returns 400 when loan already processed', async () => {
    const existingLoan = { id: 'loan-1', status: 'approved' };

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [existingLoan] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'loan-1' },
      body: { status: 'approved', notes: '' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await loanController.approveLoan(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Loan has already been processed',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('deleteLoan returns 404 when loan does not exist', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'missing-loan' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await loanController.deleteLoan(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Loan not found',
    });
    expect(client.release).toHaveBeenCalled();
  });
});
