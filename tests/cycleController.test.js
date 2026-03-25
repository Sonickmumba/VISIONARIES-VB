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
  createBulkNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/interest.util', () => ({
  calculateSavingsInterest: jest.fn().mockResolvedValue([]),
  calculateCommonInterestDistribution: jest.fn().mockResolvedValue(undefined),
  calculateShareout: jest.fn(),
}));

const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createBulkNotifications } = require('../utils/notification.util');
const { calculateShareout } = require('../utils/interest.util');
const cycleController = require('../controllers/cycleController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('cycleController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createCycle returns 404 when group does not exist', async () => {
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
        groupId: 'group-1',
        name: 'March Cycle',
        startDate: '2026-03-01',
        endDate: '2026-08-31',
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await cycleController.createCycle(req, res);

    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Group not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('createCycle returns 201 and creates notifications on success', async () => {
    const createdCycle = {
      id: 'cycle-1',
      group_id: 'group-1',
      name: 'March Cycle',
      status: 'active',
    };

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'group-1' }] })
        .mockResolvedValueOnce({ rows: [createdCycle] })
        .mockResolvedValueOnce({ rows: [{ user_id: 'member-1' }, { user_id: 'member-2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        groupId: 'group-1',
        name: 'March Cycle',
        startDate: '2026-03-01',
        endDate: '2026-08-31',
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await cycleController.createCycle(req, res);

    expect(logAudit).toHaveBeenCalled();
    expect(createBulkNotifications).toHaveBeenCalledWith(
      client,
      ['member-1', 'member-2'],
      expect.any(String),
      'New Cycle Started',
      'A new savings cycle "March Cycle" has been started',
      'cycle-1'
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Cycle created successfully',
      data: createdCycle,
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('getCycleById returns 404 when cycle does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-cycle' } };
    const res = createRes();

    await cycleController.getCycleById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cycle not found',
    });
  });

  test('getCycleStatistics returns aggregated data', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total_members: '4', total_amount: '12000', average_amount: '3000' }] })
      .mockResolvedValueOnce({ rows: [{ total_loans: '2', total_amount: '7000', repaid_count: '1', active_count: '1', defaulted_count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total_interest: '500' }] });

    const req = { params: { id: 'cycle-1' } };
    const res = createRes();

    await cycleController.getCycleStatistics(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        savings: { total_members: '4', total_amount: '12000', average_amount: '3000' },
        loans: { total_loans: '2', total_amount: '7000', repaid_count: '1', active_count: '1', defaulted_count: '0' },
        interest: { total_interest: '500' },
      },
    });
  });

  test('calculateShareout returns 404 when cycle does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-cycle' } };
    const res = createRes();

    await cycleController.calculateShareout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cycle not found',
    });
  });

  test('calculateShareout returns computed shareout list on success', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'cycle-1', name: 'March Cycle', status: 'active' }] })
      .mockResolvedValueOnce({
        rows: [
          { user_id: 'member-1', total_savings: '1000', savings_interest: '100' },
          { user_id: 'member-2', total_savings: '800', savings_interest: '80' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ user_id: 'member-1', common_interest: '50' }] });

    calculateShareout
      .mockReturnValueOnce(1150)
      .mockReturnValueOnce(880);

    const req = { params: { id: 'cycle-1' } };
    const res = createRes();

    await cycleController.calculateShareout(req, res);

    expect(calculateShareout).toHaveBeenNthCalledWith(1, 1000, 100, 50);
    expect(calculateShareout).toHaveBeenNthCalledWith(2, 800, 80, 0);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Shareout calculated successfully',
      data: {
        cycle: { id: 'cycle-1', name: 'March Cycle', status: 'active' },
        shareouts: [
          {
            userId: 'member-1',
            totalSavings: 1000,
            savingsInterest: 100,
            commonInterest: 50,
            totalAmount: 1150,
          },
          {
            userId: 'member-2',
            totalSavings: 800,
            savingsInterest: 80,
            commonInterest: 0,
            totalAmount: 880,
          },
        ],
      },
    });
  });
});
