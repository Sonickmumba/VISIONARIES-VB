const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { ROLES } = require('../config/constants');

const countOtherActiveSuperAdmins = async (client, userId) => {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = $1
       AND is_active = true
       AND id <> $2`,
    [ROLES.SUPER_ADMIN, userId]
  );

  return Number(result.rows[0]?.count || 0);
};

/**
 * Get all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search } = req.query;

    let query = `
      SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at, u.member_no,
             g.id as group_id, g.name as group_name,
             COALESCE(s.total_savings, 0) AS total_savings,
             COALESCE(l.outstanding_loan, 0) AS outstanding_loan,
             GREATEST(20000 - COALESCE(s.total_savings, 0), 0) AS shortfall
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id AND gm.is_active = true
      LEFT JOIN groups g ON gm.group_id = g.id AND g.is_active = true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CASE WHEN sv.status = 'verified' THEN sv.amount ELSE 0 END), 0) AS total_savings
        FROM savings sv
        WHERE sv.user_id = u.id
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CASE WHEN ln.status IN ('approved', 'disbursed', 'defaulted') THEN GREATEST(ln.total_amount - COALESCE(ln.amount_repaid, 0), 0) ELSE 0 END), 0) AS outstanding_loan
        FROM loans ln
        WHERE ln.user_id = u.id
      ) l ON true
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
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY u.name';

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
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at, u.updated_at, u.member_no,
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
 * Get detailed member profile with current cycle financial summary
 */
exports.getMemberDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const detailQuery = `
      WITH member_base AS (
        SELECT
          u.id,
          u.member_no,
          u.email,
          u.name,
          u.phone,
          u.national_id,
          u.role,
          u.is_active,
          u.created_at,
          u.updated_at,
          g.id AS group_id,
          g.name AS group_name,
          active_cycle.id AS cycle_id,
          active_cycle.name AS cycle_name,
          active_cycle.start_date AS cycle_start_date,
          active_cycle.end_date AS cycle_end_date,
          active_cycle.status AS cycle_status
        FROM users u
        LEFT JOIN group_members gm
          ON u.id = gm.user_id
         AND gm.is_active = true
        LEFT JOIN groups g
          ON gm.group_id = g.id
         AND g.is_active = true
        LEFT JOIN LATERAL (
          SELECT c.id, c.name, c.start_date, c.end_date, c.status
          FROM cycles c
          WHERE c.group_id = g.id
            AND c.status = 'active'
          ORDER BY c.start_date DESC, c.created_at DESC
          LIMIT 1
        ) active_cycle ON true
        WHERE u.id = $1
      )
      SELECT
        mb.*,
        COALESCE(s.total_savings, 0) AS total_savings,
        COALESCE(s.total_savings_interest, 0) AS total_savings_interest,
        COALESCE(s.verified_savings_count, 0) AS verified_savings_count,
        COALESCE(s.pending_savings_count, 0) AS pending_savings_count,
        COALESCE(l.total_loan_borrowed, 0) AS total_loan_borrowed,
        COALESCE(l.outstanding_loan, 0) AS outstanding_loan,
        COALESCE(l.active_loans_count, 0) AS active_loans_count,
        COALESCE(l.pending_loans_count, 0) AS pending_loans_count,
        GREATEST(20000 - COALESCE(s.total_savings, 0), 0) AS shortfall,
        COALESCE(ci.common_interest_amount, 0) AS common_interest_amount
      FROM member_base mb
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(CASE WHEN sv.status = 'verified' THEN sv.amount ELSE 0 END), 0) AS total_savings,
          COALESCE(SUM(CASE WHEN sv.status = 'verified' THEN sv.interest_earned ELSE 0 END), 0) AS total_savings_interest,
          COUNT(*) FILTER (WHERE sv.status = 'verified') AS verified_savings_count,
          COUNT(*) FILTER (WHERE sv.status = 'pending') AS pending_savings_count
        FROM savings sv
        WHERE sv.user_id = mb.id
          AND (mb.cycle_id IS NULL OR sv.cycle_id = mb.cycle_id)
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(CASE WHEN ln.status IN ('approved', 'disbursed', 'repaid', 'defaulted') THEN ln.amount ELSE 0 END), 0) AS total_loan_borrowed,
          COALESCE(SUM(CASE WHEN ln.status IN ('approved', 'disbursed', 'defaulted', 'repaid') THEN GREATEST(ln.total_amount - COALESCE(ln.amount_repaid, 0), 0) ELSE 0 END), 0) AS outstanding_loan,
          COUNT(*) FILTER (WHERE ln.status IN ('approved', 'disbursed', 'defaulted')) AS active_loans_count,
          COUNT(*) FILTER (WHERE ln.status = 'pending') AS pending_loans_count
        FROM loans ln
        WHERE ln.user_id = mb.id
          AND (mb.cycle_id IS NULL OR ln.cycle_id = mb.cycle_id)
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(cid.amount), 0) AS common_interest_amount
        FROM common_interest_distributions cid
        WHERE cid.user_id = mb.id
          AND (mb.cycle_id IS NULL OR cid.cycle_id = mb.cycle_id)
      ) ci ON true
    `;

    const detailResult = await db.query(detailQuery, [id]);

    if (detailResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const member = detailResult.rows[0];

    const [recentSavingsResult, recentLoansResult] = await Promise.all([
      db.query(
        `SELECT id, amount, month, year, status, payment_date, created_at
         FROM savings
         WHERE user_id = $1
           AND ($2::uuid IS NULL OR cycle_id = $2)
         ORDER BY year DESC, month DESC, created_at DESC
         LIMIT 6`,
        [id, member.cycle_id || null]
      ),
      db.query(
        `SELECT id, amount, total_amount, amount_repaid, status, purpose, requested_date, due_date, created_at
         FROM loans
         WHERE user_id = $1
           AND ($2::uuid IS NULL OR cycle_id = $2)
         ORDER BY requested_date DESC, created_at DESC
         LIMIT 6`,
        [id, member.cycle_id || null]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        ...member,
        recent_savings: recentSavingsResult.rows,
        recent_loans: recentLoansResult.rows,
      },
    });
  } catch (error) {
    console.error('Get member details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving member details',
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
    const { name, phone, email } = req.body;

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
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, name, phone, role, is_active, created_at, updated_at`,
      [name, phone, email, id]
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

    if (req.user.id === id && role !== ROLES.SUPER_ADMIN) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You cannot demote your own super admin account',
      });
    }

    if (oldUser.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN) {
      const otherSuperAdmins = await countOtherActiveSuperAdmins(client, id);
      if (otherSuperAdmins === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last active super admin',
        });
      }
    }

    // Update role
    const result = await client.query(
      `UPDATE users 
       SET role = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name, phone, role, is_active, created_at, updated_at`,
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

    if (req.user.id === id && oldUser.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    if (oldUser.role === ROLES.SUPER_ADMIN && oldUser.is_active) {
      const otherSuperAdmins = await countOtherActiveSuperAdmins(client, id);
      if (otherSuperAdmins === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active super admin',
        });
      }
    }

    // Toggle status
    const result = await client.query(
      `UPDATE users 
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, phone, role, is_active, created_at, updated_at`,
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

    if (req.user.id === id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    if (user.role === ROLES.SUPER_ADMIN && user.is_active) {
      const otherSuperAdmins = await countOtherActiveSuperAdmins(client, id);
      if (otherSuperAdmins === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active super admin',
        });
      }
    }

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
