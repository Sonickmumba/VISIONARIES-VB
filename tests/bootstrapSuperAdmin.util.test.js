const bcrypt = require('bcryptjs');
const {
  bootstrapSuperAdminWithClient,
} = require('../utils/bootstrapSuperAdmin.util');

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('bootstrapSuperAdminWithClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('promotes existing user to super admin', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'admin@test.com', role: 'member', is_active: false }] })
        .mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'admin@test.com', role: 'super_admin', is_active: true }] })
        .mockResolvedValueOnce({}),
    };

    const result = await bootstrapSuperAdminWithClient({
      client,
      email: 'admin@test.com',
      name: 'Admin User',
      password: 'Pass1234!',
      nationalId: '123456/78/1',
    });

    expect(result.action).toBe('promoted');
    expect(result.user.role).toBe('super_admin');
  });

  test('creates new super admin when user does not exist', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'u2', email: 'new@test.com', role: 'super_admin', is_active: true }] })
        .mockResolvedValueOnce({}),
    };

    const result = await bootstrapSuperAdminWithClient({
      client,
      email: 'new@test.com',
      name: 'New Super Admin',
      password: 'Pass1234!',
      nationalId: '123456/78/1',
      phone: '0977000000',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Pass1234!', 10);
    expect(result.action).toBe('created');
    expect(result.user.email).toBe('new@test.com');
  });

  test('throws when creating new user without required fields', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({}),
    };

    await expect(
      bootstrapSuperAdminWithClient({
        client,
        email: 'new@test.com',
      })
    ).rejects.toThrow(
      'SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NATIONAL_ID are required to create a new super admin user'
    );

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
