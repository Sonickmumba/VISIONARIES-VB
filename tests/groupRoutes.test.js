const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

jest.mock('../controllers/groupController', () => ({
  getPublicGroups: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getPublicGroups' })),
  createGroup: jest.fn((req, res) => res.status(201).json({ success: true, route: 'createGroup' })),
  getAllGroups: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getAllGroups' })),
  getGroupById: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getGroupById' })),
  updateGroup: jest.fn((req, res) => res.status(200).json({ success: true, route: 'updateGroup' })),
  addMember: jest.fn((req, res) => res.status(200).json({ success: true, route: 'addMember' })),
  removeMember: jest.fn((req, res) => res.status(200).json({ success: true, route: 'removeMember' })),
  deleteGroup: jest.fn((req, res) => res.status(200).json({ success: true, route: 'deleteGroup' })),
}));

const groupController = require('../controllers/groupController');
const groupRoutes = require('../routes/groupRoutes');

describe('groupRoutes integration tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/groups', groupRoutes);
  });

  test('POST /api/groups rejects invalid body', async () => {
    const response = await request(app).post('/api/groups').send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(groupController.createGroup).not.toHaveBeenCalled();
  });

  test('POST /api/groups calls createGroup on valid payload', async () => {
    const response = await request(app).post('/api/groups').send({
      name: 'Group One',
      description: 'Test group',
      leaderId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(response.status).toBe(201);
    expect(response.body.route).toBe('createGroup');
    expect(groupController.createGroup).toHaveBeenCalled();
  });

  test('GET /api/groups calls getAllGroups', async () => {
    const response = await request(app).get('/api/groups');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getAllGroups');
    expect(groupController.getAllGroups).toHaveBeenCalled();
  });

  test('GET /api/groups/:id calls getGroupById', async () => {
    const response = await request(app).get('/api/groups/group-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getGroupById');
    expect(groupController.getGroupById).toHaveBeenCalled();
  });

  test('PUT /api/groups/:id calls updateGroup', async () => {
    const response = await request(app).put('/api/groups/group-1').send({
      name: 'Updated Group Name',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('updateGroup');
    expect(groupController.updateGroup).toHaveBeenCalled();
  });

  test('POST /api/groups/:id/members calls addMember', async () => {
    const response = await request(app).post('/api/groups/group-1/members').send({ userId: 'user-2' });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('addMember');
    expect(groupController.addMember).toHaveBeenCalled();
  });

  test('DELETE /api/groups/:id/members/:userId calls removeMember', async () => {
    const response = await request(app).delete('/api/groups/group-1/members/user-2');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('removeMember');
    expect(groupController.removeMember).toHaveBeenCalled();
  });

  test('DELETE /api/groups/:id calls deleteGroup', async () => {
    const response = await request(app).delete('/api/groups/group-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('deleteGroup');
    expect(groupController.deleteGroup).toHaveBeenCalled();
  });
});
