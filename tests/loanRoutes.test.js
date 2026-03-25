const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  isAdmin: (req, res, next) => next(),
}));

jest.mock('../controllers/loanController', () => ({
  createLoan: jest.fn((req, res) => res.status(201).json({ success: true, route: 'createLoan' })),
  getLoansByCycle: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getLoansByCycle' })),
  getLoansByUser: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getLoansByUser' })),
  getLoanById: jest.fn((req, res) => res.status(200).json({ success: true, route: 'getLoanById' })),
  approveLoan: jest.fn((req, res) => res.status(200).json({ success: true, route: 'approveLoan' })),
  disburseLoan: jest.fn((req, res) => res.status(200).json({ success: true, route: 'disburseLoan' })),
  repayLoan: jest.fn((req, res) => res.status(200).json({ success: true, route: 'repayLoan' })),
  verifyRepayment: jest.fn((req, res) => res.status(200).json({ success: true, route: 'verifyRepayment' })),
  deleteLoan: jest.fn((req, res) => res.status(200).json({ success: true, route: 'deleteLoan' })),
}));

const loanController = require('../controllers/loanController');
const loanRoutes = require('../routes/loanRoutes');

describe('loanRoutes integration tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/loans', loanRoutes);
  });

  test('POST /api/loans rejects invalid create payload', async () => {
    const response = await request(app).post('/api/loans').send({
      cycleId: 'bad-id',
      amount: -10,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(loanController.createLoan).not.toHaveBeenCalled();
  });

  test('POST /api/loans calls createLoan on valid payload', async () => {
    const response = await request(app).post('/api/loans').send({
      cycleId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 5000,
      purpose: 'Business',
    });

    expect(response.status).toBe(201);
    expect(response.body.route).toBe('createLoan');
    expect(loanController.createLoan).toHaveBeenCalled();
  });

  test('GET /api/loans/cycle/:cycleId calls getLoansByCycle', async () => {
    const response = await request(app).get('/api/loans/cycle/cycle-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getLoansByCycle');
    expect(loanController.getLoansByCycle).toHaveBeenCalled();
  });

  test('GET /api/loans/user/:userId calls getLoansByUser', async () => {
    const response = await request(app).get('/api/loans/user/user-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('getLoansByUser');
    expect(loanController.getLoansByUser).toHaveBeenCalled();
  });

  test('POST /api/loans/:id/approve rejects invalid status payload', async () => {
    const response = await request(app).post('/api/loans/loan-1/approve').send({
      status: 'pending',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
    expect(loanController.approveLoan).not.toHaveBeenCalled();
  });

  test('POST /api/loans/:id/approve calls approveLoan on valid payload', async () => {
    const response = await request(app).post('/api/loans/loan-1/approve').send({
      status: 'approved',
      notes: 'ok',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('approveLoan');
    expect(loanController.approveLoan).toHaveBeenCalled();
  });

  test('POST /api/loans/:id/disburse calls disburseLoan', async () => {
    const response = await request(app).post('/api/loans/loan-1/disburse');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('disburseLoan');
    expect(loanController.disburseLoan).toHaveBeenCalled();
  });

  test('POST /api/loans/:id/repay calls repayLoan on valid payload', async () => {
    const response = await request(app).post('/api/loans/loan-1/repay').send({
      amount: 1000,
      notes: 'partial',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('repayLoan');
    expect(loanController.repayLoan).toHaveBeenCalled();
  });

  test('POST /api/loans/:id/verify-repayment/:repaymentId calls verifyRepayment', async () => {
    const response = await request(app).post('/api/loans/loan-1/verify-repayment/repay-1').send({
      status: 'verified',
    });

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('verifyRepayment');
    expect(loanController.verifyRepayment).toHaveBeenCalled();
  });

  test('DELETE /api/loans/:id calls deleteLoan', async () => {
    const response = await request(app).delete('/api/loans/loan-1');

    expect(response.status).toBe(200);
    expect(response.body.route).toBe('deleteLoan');
    expect(loanController.deleteLoan).toHaveBeenCalled();
  });
});
