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
  calculateSavingsInterest: jest.fn(),
}));

const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createNotification } = require('../utils/notification.util');
const { calculateSavingsInterest } = require('../utils/interest.util');
const savingsController = require('../controllers/savingsController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('savingsController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createSavings returns 404 when cycle does not exist', async () => {
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
      body: {
        cycleId: 'cycle-1',
        userId: 'user-1',
        amount: 1000,
        month: 3,
        year: 2026,
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createSavings(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cycle not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('createSavings returns 201 on success and sends notifications', async () => {
    const savings = {
      id: 'sav-1',
      cycle_id: 'cycle-1',
      user_id: 'user-1',
      amount: 1000,
      month: 3,
      year: 2026,
    };

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', status: 'active' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [savings] })
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }, { id: 'admin-2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        cycleId: 'cycle-1',
        userId: 'user-1',
        amount: 1000,
        month: 3,
        year: 2026,
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createSavings(req, res);

    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Savings recorded successfully',
      data: savings,
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('getSavingsById returns 404 when record not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-savings' } };
    const res = createRes();

    await savingsController.getSavingsById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Savings record not found',
    });
  });

  test('getSavingsByCycle maps interest into response', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'sav-1',
          amount: 1000,
          month: 3,
          year: 2026,
        },
      ],
    });
    calculateSavingsInterest.mockReturnValue(150);

    const req = { params: { cycleId: 'cycle-1' } };
    const res = createRes();

    await savingsController.getSavingsByCycle(req, res);

    expect(calculateSavingsInterest).toHaveBeenCalledWith(1000, 9);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          id: 'sav-1',
          amount: 1000,
          month: 3,
          year: 2026,
          interestEarned: 150,
        },
      ],
    });
  });
});
