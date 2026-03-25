const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');

/**
 * Get all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_active, u.created_at,
             g.id as group_id, g.name as group_name
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id AND gm.is_active = true
      LEFT JOIN groups g ON gm.group_id = g.id AND g.is_active = true
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (isActive !== undefined) {
      query += ` AND u.is_active = $${paramCount}`;
      params.push(isActive === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY u.last_name, u.first_name';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
    });
  }
};

/**
 * Get user by ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_active, u.created_at, u.updated_at,
              g.id as group_id, g.name as group_name
       FROM users u
       LEFT JOIN group_members gm ON u.id = gm.user_id AND gm.is_active = true
       LEFT JOIN groups g ON gm.group_id = g.id AND g.is_active = true
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
    });
  }
};

/**
 * Update user
 */
exports.updateUser = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email } = req.body;

    await client.query('BEGIN');

    // Get existing user
    const existingResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const oldUser = existingResult.rows[0];

    // Check if email is being changed and if it's already taken
    if (email && email !== oldUser.email) {
      const emailResult = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
    }

    // Update user
    const result = await client.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at, updated_at`,
      [firstName, lastName, phone, email, id]
    );

    const user = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'USER_UPDATED',
      'users',
      id,
      oldUser,
      user,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
    });
  } finally {
    client.release();
  }
};

/**
 * Update user role (Super Admin only)
 */
exports.updateUserRole = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { role } = req.body;

    await client.query('BEGIN');

    // Get existing user
    const existingResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const oldUser = existingResult.rows[0];

    // Update role
    const result = await client.query(
      `UPDATE users 
       SET role = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at, updated_at`,
      [role, id]
    );

    const user = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'USER_ROLE_UPDATED',
      'users',
      id,
      { role: oldUser.role },
      { role: user.role },
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
    });
  } finally {
    client.release();
  }
};

/**
 * Toggle user active status (Super Admin only)
 */
exports.toggleUserStatus = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get existing user
    const existingResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const oldUser = existingResult.rows[0];

    // Toggle status
    const result = await client.query(
      `UPDATE users 
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at, updated_at`,
      [id]
    );

    const user = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'USER_STATUS_TOGGLED',
      'users',
      id,
      { is_active: oldUser.is_active },
      { is_active: user.is_active },
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
    });
  } finally {
    client.release();
  }
};

/**
 * Delete user (Super Admin only)
 */
exports.deleteUser = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get user
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Delete user (will cascade delete related records)
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'USER_DELETED',
      'users',
      id,
      user,
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
    });
  } finally {
    client.release();
  }
};
