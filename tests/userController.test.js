jest.mock('../config/database', () => ({
  pool: {
    connect: jest.fn(),
  },
  query: jest.fn(),
}));

jest.mock('../utils/audit.util', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const userController = require('../controllers/userController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('userController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getUserById returns 404 when user does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-user' } };
    const res = createRes();

    await userController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
  });

  test('getAllUsers returns users list', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'user1@test.com', role: 'member' }],
    });

    const req = { query: {} };
    const res = createRes();

    await userController.getAllUsers(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'user-1', email: 'user1@test.com', role: 'member' }],
    });
  });

  test('updateUser returns 400 when new email is already in use', async () => {
    const oldUser = { id: 'user-1', email: 'old@test.com' };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [oldUser] })
        .mockResolvedValueOnce({ rows: [{ id: 'user-2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'user-1' },
      body: { email: 'taken@test.com' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await userController.updateUser(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email already in use',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('toggleUserStatus returns 404 when user does not exist', async () => {
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
      params: { id: 'missing-user' },
      user: { id: 'super-admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await userController.toggleUserStatus(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('updateUserRole prevents demoting the last active super admin', async () => {
    const oldUser = { id: 'super-1', role: 'super_admin', is_active: true };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [oldUser] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'super-1' },
      body: { role: 'admin' },
      user: { id: 'super-2' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await userController.updateUserRole(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cannot demote the last active super admin',
    });
  });

  test('toggleUserStatus prevents deactivating own account', async () => {
    const oldUser = { id: 'super-1', role: 'super_admin', is_active: true };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [oldUser] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'super-1' },
      user: { id: 'super-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await userController.toggleUserStatus(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'You cannot deactivate your own account',
    });
  });

  test('getMemberDetails returns 404 when member does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-user' } };
    const res = createRes();

    await userController.getMemberDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
  });

  test('getMemberDetails returns member with financial data', async () => {
    const memberRow = {
      id: 'user-1',
      name: 'Test User',
      member_no: 'VB-001',
      email: 'test@test.com',
      phone: '0999111222',
      national_id: '123456',
      total_savings: 25000,
      total_loan_borrowed: 50000,
      outstanding_loan: 20000,
      shortfall: 0,
      common_interest_amount: 0,
      cycle_id: 'cycle-1',
    };

    db.query
      .mockResolvedValueOnce({ rows: [memberRow] })           // detail query
      .mockResolvedValueOnce({ rows: [{ id: 's1', amount: 5000, month: 1, year: 2024, status: 'verified' }] })  // recent savings
      .mockResolvedValueOnce({ rows: [{ id: 'l1', amount: 50000, total_amount: 55000, amount_repaid: 35000, status: 'disbursed' }] }); // recent loans

    const req = { params: { id: 'user-1' } };
    const res = createRes();

    await userController.getMemberDetails(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: 'user-1',
        total_savings: 25000,
        outstanding_loan: 20000,
        recent_savings: expect.any(Array),
        recent_loans: expect.any(Array),
      }),
    });
  });

  test('deleteUser prevents deleting the last active super admin', async () => {
    const oldUser = { id: 'super-1', role: 'super_admin', is_active: true };
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [oldUser] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'super-1' },
      user: { id: 'super-2' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await userController.deleteUser(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Cannot delete the last active super admin',
    });
  });
});
