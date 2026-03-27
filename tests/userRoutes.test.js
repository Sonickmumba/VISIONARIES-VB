const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'super-admin-1', role: 'super_admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
  isSuperAdmin: (req, res, next) => next(),
}));

jest.mock('../controllers/userController', () => ({
  getAllUsers: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getAllUsers' })),
  getMemberDetails: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getMemberDetails' })),
  getUserById: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getUserById' })),
  updateUser: jest.fn((req, res) => res.status(200).json({ success: true, route: 'updateUser' })),
  updateUserRole: jest.fn((req, res) => res.status(200).json({ success: true, route: 'updateUserRole' })),
  toggleUserStatus: jest.fn((req, res) => res.status(200).json({ success: true, route: 'toggleUserStatus' })),
  deleteUser: jest.fn((req, res) => res.status(200).json({ success: true, route: 'deleteUser' })),
}));

const userController = require('../controllers/userController');
const userRoutes = require('../routes/userRoutes');

describe('userRoutes integration tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
  });

  test('GET /api/users calls getAllUsers', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getAllUsers');
    expect(userController.getAllUsers).toHaveBeenCalled();
  });

  test('GET /api/users/:id calls getUserById', async () => {
    const response = await request(app).get('/api/users/user-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getUserById');
    expect(userController.getUserById).toHaveBeenCalled();
  });

  test('GET /api/users/:id/details calls getMemberDetails', async () => {
    const response = await request(app).get('/api/users/user-1/details');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getMemberDetails');
    expect(userController.getMemberDetails).toHaveBeenCalled();
  });

  test('PUT /api/users/:id rejects invalid email payload', async () => {
    const response = await request(app).put('/api/users/user-1').send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(userController.updateUser).not.toHaveBeenCalled();
  });

  test('PUT /api/users/:id calls updateUser on valid payload', async () => {
    const response = await request(app).put('/api/users/user-1').send({
      firstName: 'John',
      email: 'john@test.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('updateUser');
    expect(userController.updateUser).toHaveBeenCalled();
  });

  test('PUT /api/users/:id/role rejects invalid role payload', async () => {
    const response = await request(app).put('/api/users/user-1/role').send({
      role: 'guest',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(userController.updateUserRole).not.toHaveBeenCalled();
  });

  test('PUT /api/users/:id/role calls updateUserRole on valid payload', async () => {
    const response = await request(app).put('/api/users/user-1/role').send({
      role: 'admin',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('updateUserRole');
    expect(userController.updateUserRole).toHaveBeenCalled();
  });

  test('PUT /api/users/:id/toggle-status calls toggleUserStatus', async () => {
    const response = await request(app).put('/api/users/user-1/toggle-status');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('toggleUserStatus');
    expect(userController.toggleUserStatus).toHaveBeenCalled();
  });

  test('DELETE /api/users/:id calls deleteUser', async () => {
    const response = await request(app).delete('/api/users/user-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('deleteUser');
    expect(userController.deleteUser).toHaveBeenCalled();
  });
});
