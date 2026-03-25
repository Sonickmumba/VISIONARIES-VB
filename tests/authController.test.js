jest.mock('passport', () => ({
  authenticate: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../config/database', () => ({
  pool: {},
  query: jest.fn(),
}));

jest.mock('../utils/audit.util', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

const passport = require('passport');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../utils/audit.util');
const authController = require('../controllers/authController');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_EXPIRE = '7d';
  });

  test('register returns 201 with token when passport local-signup succeeds', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      national_id: '12345678',
      phone: '0700000000',
      role: 'member',
      is_active: true,
      created_at: '2026-03-25T00:00:00.000Z',
    };

    passport.authenticate.mockImplementation((strategy, options, callback) => {
      expect(strategy).toBe('local-signup');
      expect(options).toEqual({ session: false });
      return () => callback(null, mockUser, null);
    });

    jwt.sign.mockReturnValue('signed_token');

    const req = {
      body: {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        nationalId: '12345678',
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };
    const res = createRes();

    authController.register(req, res, jest.fn());
    await new Promise(process.nextTick);

    expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-1', role: 'member' }, 'test_secret', {
      expiresIn: '7d',
    });
    expect(logAudit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User registered successfully',
      })
    );
  });

  test('login returns 401 when passport local-login returns no user', async () => {
    passport.authenticate.mockImplementation((strategy, options, callback) => {
      expect(strategy).toBe('local-login');
      expect(options).toEqual({ session: false });
      return () => callback(null, false, { message: 'Invalid email or password' });
    });

    const req = { body: { email: 'x@example.com', password: 'bad' } };
    const res = createRes();

    authController.login(req, res, jest.fn());
    await new Promise(process.nextTick);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid email or password',
    });
  });

  test('refreshToken returns 400 when token is missing', async () => {
    const req = { body: {} };
    const res = createRes();

    await authController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token is required',
    });
  });

  test('refreshToken returns new token when token is valid', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-2', role: 'admin' });
    jwt.sign.mockReturnValue('new_token_value');

    const req = { body: { token: 'old_token' } };
    const res = createRes();

    await authController.refreshToken(req, res);

    expect(jwt.verify).toHaveBeenCalledWith('old_token', 'test_secret', { ignoreExpiration: true });
    expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-2', role: 'admin' }, 'test_secret', {
      expiresIn: '7d',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Token refreshed successfully',
      data: { token: 'new_token_value' },
    });
  });
});
