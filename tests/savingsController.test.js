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
        .mockResolvedValueOnce({})                                                                           // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] }) // cycle check
        .mockResolvedValueOnce({ rows: [] })                                                                  // duplicate check
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })                                                    // per-cycle total
        .mockResolvedValueOnce({ rows: [savings] })                                                           // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }, { id: 'admin-2' }] })                              // admins
        .mockResolvedValueOnce({}),                                                                           // COMMIT
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

  test('createSavings returns 400 when per-cycle cap exceeded', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})                                                                           // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] })
        .mockResolvedValueOnce({ rows: [] })                                                                  // no duplicate
        .mockResolvedValueOnce({ rows: [{ total: '25000' }] })                                                // existing total
        .mockResolvedValueOnce({}),                                                                           // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: { cycleId: 'cycle-1', userId: 'user-1', amount: 6000, month: 3, year: 2026 },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createSavings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('per-cycle limit') })
    );
  });

  test('createSavings returns 400 when month is outside cycle range', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})                                                                           // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] })
        .mockResolvedValueOnce({}),                                                                           // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: { cycleId: 'cycle-1', userId: 'user-1', amount: 1000, month: 9, year: 2026 },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createSavings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('outside the cycle period') })
    );
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

  test('createBulkSavings returns 404 when cycle does not exist', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})             // BEGIN
        .mockResolvedValueOnce({ rows: [] })   // cycle check
        .mockResolvedValueOnce({}),            // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        cycleId: 'cycle-missing',
        month: 3,
        year: 2026,
        entries: [{ userId: 'user-1', amount: 5000 }],
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createBulkSavings(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cycle not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('createBulkSavings returns 201 on success', async () => {
    const created = [
      { id: 'sav-1', cycle_id: 'cycle-1', user_id: 'user-1', amount: 5000, month: 3, year: 2026 },
      { id: 'sav-2', cycle_id: 'cycle-1', user_id: 'user-2', amount: 10000, month: 3, year: 2026 },
    ];

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})                                          // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', group_id: 'grp-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] }) // cycle check
        .mockResolvedValueOnce({ rows: [] })                                 // duplicate check
        .mockResolvedValueOnce({ rows: [] })                                 // per-cycle totals (no prior savings)
        .mockResolvedValueOnce({ rows: created })                            // INSERT
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }] })               // admins query
        .mockResolvedValueOnce({}),                                          // COMMIT
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        cycleId: 'cycle-1',
        month: 3,
        year: 2026,
        entries: [
          { userId: 'user-1', amount: 5000 },
          { userId: 'user-2', amount: 10000 },
        ],
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createBulkSavings(req, res);

    expect(logAudit).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: '2 savings recorded successfully',
      data: created,
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('createBulkSavings returns 400 when per-cycle cap exceeded', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})                                          // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', group_id: 'grp-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] })
        .mockResolvedValueOnce({ rows: [] })                                 // no duplicates
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', total: '28000' }] }) // user-1 already at 28000
        .mockResolvedValueOnce({}),                                          // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        cycleId: 'cycle-1',
        month: 4,
        year: 2026,
        entries: [
          { userId: 'user-1', amount: 5000 },
        ],
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createBulkSavings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('per-cycle limit'), overLimitUsers: expect.any(Array) })
    );
  });

  test('createBulkSavings returns 400 when month is outside cycle range', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})                                          // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', group_id: 'grp-1', status: 'active', start_date: '2026-01-01', end_date: '2026-06-30' }] })
        .mockResolvedValueOnce({}),                                          // ROLLBACK
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        cycleId: 'cycle-1',
        month: 9,
        year: 2026,
        entries: [{ userId: 'user-1', amount: 5000 }],
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await savingsController.createBulkSavings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('outside the cycle period') })
    );
  });
});
