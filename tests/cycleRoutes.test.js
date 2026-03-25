const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

jest.mock('../controllers/cycleController', () => ({
  createCycle: jest.fn((req, res) => res.status(201).json({ success: true, route: 'createCycle' })),
  getCyclesByGroup: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getCyclesByGroup' })),
  getCycleById: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getCycleById' })),
  updateCycle: jest.fn((req, res) => res.status(200).json({ success: true, route: 'updateCycle' })),
  closeCycle: jest.fn((req, res) => res.status(200).json({ success: true, route: 'closeCycle' })),
  calculateShareout: jest.fn((req, res) => res.status(200).json({ success: true, route: 'calculateShareout' })),
  deleteCycle: jest.fn((req, res) => res.status(200).json({ success: true, route: 'deleteCycle' })),
}));

const cycleController = require('../controllers/cycleController');
const cycleRoutes = require('../routes/cycleRoutes');

describe('cycleRoutes integration tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/cycles', cycleRoutes);
  });

  test('POST /api/cycles validates payload and rejects invalid body', async () => {
    const response = await request(app).post('/api/cycles').send({
      groupId: 'not-a-uuid',
      name: '',
      startDate: 'bad-date',
      endDate: 'bad-date',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(cycleController.createCycle).not.toHaveBeenCalled();
  });

  test('POST /api/cycles calls createCycle on valid payload', async () => {
    const response = await request(app).post('/api/cycles').send({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Cycle',
      startDate: '2026-03-01',
      endDate: '2026-08-01',
    });

    expect(response.status).toBe(201);
    expect(response.body.route).toBe('createCycle');
    expect(cycleController.createCycle).toHaveBeenCalled();
  });

  test('GET /api/cycles/group/:groupId calls getCyclesByGroup', async () => {
    const response = await request(app).get('/api/cycles/group/group-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getCyclesByGroup');
    expect(cycleController.getCyclesByGroup).toHaveBeenCalled();
  });

  test('POST /api/cycles/:id/calculate-shareout calls calculateShareout', async () => {
    const response = await request(app).post('/api/cycles/cycle-1/calculate-shareout');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('calculateShareout');
    expect(cycleController.calculateShareout).toHaveBeenCalled();
  });

  test('PUT /api/cycles/:id calls updateCycle', async () => {
    const response = await request(app).put('/api/cycles/cycle-1').send({
      name: 'Updated Cycle Name',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('updateCycle');
    expect(cycleController.updateCycle).toHaveBeenCalled();
  });

  test('DELETE /api/cycles/:id calls deleteCycle', async () => {
    const response = await request(app).delete('/api/cycles/cycle-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('deleteCycle');
    expect(cycleController.deleteCycle).toHaveBeenCalled();
  });

  test('POST /api/cycles/:id/close calls closeCycle', async () => {
    const response = await request(app).post('/api/cycles/cycle-1/close');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('closeCycle');
    expect(cycleController.closeCycle).toHaveBeenCalled();
  });
});
