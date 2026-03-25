const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const bootstrapSuperAdminWithClient = async ({ client, email, name, password, nationalId, phone }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('SUPER_ADMIN_EMAIL is required');
  }

  await client.query('BEGIN');

  try {
    const existingResult = await client.query(
      `SELECT id, email, role, is_active
       FROM users
       WHERE email = $1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];

      if (existingUser.role === ROLES.SUPER_ADMIN && existingUser.is_active) {
        await client.query('COMMIT');
        return {
          action: 'unchanged',
          user: existingUser,
          message: 'Super admin already exists and is active',
        };
      }

      const updateResult = await client.query(
        `UPDATE users
         SET role = $1,
             is_active = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, role, is_active`,
        [ROLES.SUPER_ADMIN, existingUser.id]
      );

      await client.query('COMMIT');
      return {
        action: 'promoted',
        user: updateResult.rows[0],
        message: 'Existing user promoted to super admin',
      };
    }

    if (!password || !nationalId || !name) {
      throw new Error('SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_NATIONAL_ID are required to create a new super admin user');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createResult = await client.query(
      `INSERT INTO users (email, password_hash, name, national_id, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, role, is_active`,
      [normalizedEmail, passwordHash, name.trim(), nationalId.trim(), phone ? phone.trim() : null, ROLES.SUPER_ADMIN]
    );

    await client.query('COMMIT');
    return {
      action: 'created',
      user: createResult.rows[0],
      message: 'Super admin created successfully',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const bootstrapSuperAdmin = async ({ db, email, name, password, nationalId, phone }) => {
  const client = await db.pool.connect();
  try {
    return await bootstrapSuperAdminWithClient({
      client,
      email,
      name,
      password,
      nationalId,
      phone,
    });
  } finally {
    client.release();
  }
};

module.exports = {
  bootstrapSuperAdmin,
  bootstrapSuperAdminWithClient,
};
