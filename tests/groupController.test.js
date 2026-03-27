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
const groupController = require('../controllers/groupController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('groupController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createGroup returns 201 on success and adds leader member', async () => {
    const group = {
      id: 'group-1',
      name: 'Group One',
      description: 'Test group',
      leader_id: 'user-1',
    };

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [group] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      body: {
        name: 'Group One',
        description: 'Test group',
        leaderId: 'user-1',
      },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await groupController.createGroup(req, res);

    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      ['group-1', 'user-1']
    );
    expect(logAudit).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('getGroupById returns 404 when group does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: 'missing-group' } };
    const res = createRes();

    await groupController.getGroupById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Group not found',
    });
  });

  test('addMember returns 404 when user does not exist', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'group-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.pool.connect.mockResolvedValue(client);

    const req = {
      params: { id: 'group-1' },
      body: { userId: 'missing-user' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await groupController.addMember(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('deleteGroup returns 404 when group does not exist', async () => {
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
      params: { id: 'missing-group' },
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    await groupController.deleteGroup(req, res);

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Group not found',
    });
    expect(client.release).toHaveBeenCalled();
  });

  test('getPublicGroups returns list of id and name', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'grp-1', name: 'Alpha' },
        { id: 'grp-2', name: 'Beta' },
      ],
    });

    const req = {};
    const res = createRes();

    await groupController.getPublicGroups(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { id: 'grp-1', name: 'Alpha' },
        { id: 'grp-2', name: 'Beta' },
      ],
    });
  });
});
