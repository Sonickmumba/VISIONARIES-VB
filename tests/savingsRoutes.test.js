const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

jest.mock('../controllers/savingsController', () => ({
  createSavings: jest.fn((req, res) => res.status(201).json({ success: true, route: 'createSavings' })),
  createBulkSavings: jest.fn((req, res) => res.status(201).json({ success: true, route: 'createBulkSavings' })),
  getSavingsByCycle: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getSavingsByCycle' })),
  getSavingsByUser: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getSavingsByUser' })),
  getSavingsById: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getSavingsById' })),
  updateSavings: jest.fn((req, res) => res.status(200).json({ success: true, route: 'updateSavings' })),
  verifySavings: jest.fn((req, res) => res.status(200).json({ success: true, route: 'verifySavings' })),
  deleteSavings: jest.fn((req, res) => res.status(200).json({ success: true, route: 'deleteSavings' })),
}));

const savingsController = require('../controllers/savingsController');
const savingsRoutes = require('../routes/savingsRoutes');

describe('savingsRoutes integration tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/savings', savingsRoutes);
  });

  test('POST /api/savings rejects invalid payload', async () => {
    const response = await request(app).post('/api/savings').send({
      cycleId: 'bad-id',
      userId: 'bad-user',
      amount: -1,
      month: 13,
      year: 2010,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(savingsController.createSavings).not.toHaveBeenCalled();
  });

  test('POST /api/savings calls createSavings on valid payload', async () => {
    const response = await request(app).post('/api/savings').send({
      cycleId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      amount: 1000,
      month: 3,
      year: 2026,
    });

    expect(response.status).toBe(201);
    expect(response.body.route).toBe('createSavings');
    expect(savingsController.createSavings).toHaveBeenCalled();
  });

  test('GET /api/savings/cycle/:cycleId calls getSavingsByCycle', async () => {
    const response = await request(app).get('/api/savings/cycle/cycle-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getSavingsByCycle');
    expect(savingsController.getSavingsByCycle).toHaveBeenCalled();
  });

  test('GET /api/savings/user/:userId calls getSavingsByUser', async () => {
    const response = await request(app).get('/api/savings/user/user-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getSavingsByUser');
    expect(savingsController.getSavingsByUser).toHaveBeenCalled();
  });

  test('GET /api/savings/:id calls getSavingsById', async () => {
    const response = await request(app).get('/api/savings/sav-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getSavingsById');
    expect(savingsController.getSavingsById).toHaveBeenCalled();
  });

  test('PUT /api/savings/:id calls updateSavings', async () => {
    const response = await request(app).put('/api/savings/sav-1').send({ amount: 1200 });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('updateSavings');
    expect(savingsController.updateSavings).toHaveBeenCalled();
  });

  test('POST /api/savings/:id/verify rejects invalid status', async () => {
    const response = await request(app).post('/api/savings/sav-1/verify').send({ status: 'pending' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(savingsController.verifySavings).not.toHaveBeenCalled();
  });

  test('POST /api/savings/:id/verify calls verifySavings on valid payload', async () => {
    const response = await request(app).post('/api/savings/sav-1/verify').send({ status: 'verified' });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('verifySavings');
    expect(savingsController.verifySavings).toHaveBeenCalled();
  });

  test('DELETE /api/savings/:id calls deleteSavings', async () => {
    const response = await request(app).delete('/api/savings/sav-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('deleteSavings');
    expect(savingsController.deleteSavings).toHaveBeenCalled();
  });

  test('POST /api/savings/bulk rejects invalid payload', async () => {
    const response = await request(app).post('/api/savings/bulk').send({
      cycleId: 'bad-id',
      month: 13,
      year: 2010,
      entries: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(savingsController.createBulkSavings).not.toHaveBeenCalled();
  });

  test('POST /api/savings/bulk calls createBulkSavings on valid payload', async () => {
    const response = await request(app).post('/api/savings/bulk').send({
      cycleId: '550e8400-e29b-41d4-a716-446655440000',
      month: 3,
      year: 2026,
      entries: [
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 5000 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 10000 },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.route).toBe('createBulkSavings');
    expect(savingsController.createBulkSavings).toHaveBeenCalled();
  });
});
