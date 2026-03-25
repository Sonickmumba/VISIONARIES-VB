const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');

/**
 * Create group
 */
exports.createGroup = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { name, description, leaderId } = req.body;

    await client.query('BEGIN');

    // Create group
    const result = await client.query(
      `INSERT INTO groups (name, description, leader_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, leaderId]
    );

    const group = result.rows[0];

    // If leader specified, add them to the group
    if (leaderId) {
      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [group.id, leaderId]
      );
    }

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'GROUP_CREATED',
      'groups',
      group.id,
      null,
      group,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group',
    });
  } finally {
    client.release();
  }
};

/**
 * Get all groups
 */
exports.getAllGroups = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.*,
              u.name as leader_name,
              COUNT(DISTINCT gm.user_id) as member_count
       FROM groups g
       LEFT JOIN users u ON g.leader_id = u.id
       LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.is_active = true
       WHERE g.is_active = true
       GROUP BY g.id, u.name
       ORDER BY g.name`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving groups',
    });
  }
};

/**
 * Get group by ID
 */
exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get group details
    const groupResult = await db.query(
      `SELECT g.*,
              u.name as leader_name, u.email as leader_email
       FROM groups g
       LEFT JOIN users u ON g.leader_id = u.id
       WHERE g.id = $1`,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Get group members
    const membersResult = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.role, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND gm.is_active = true
       ORDER BY u.name`,
      [id]
    );

    const group = {
      ...groupResult.rows[0],
      members: membersResult.rows,
    };

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving group',
    });
  }
};

/**
 * Update group
 */
exports.updateGroup = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { name, description, leaderId } = req.body;

    await client.query('BEGIN');

    // Get existing group
    const existingResult = await client.query(
      'SELECT * FROM groups WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const oldGroup = existingResult.rows[0];

    // Update group
    const result = await client.query(
      `UPDATE groups 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           leader_id = COALESCE($3, leader_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, leaderId, id]
    );

    const group = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'GROUP_UPDATED',
      'groups',
      id,
      oldGroup,
      group,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group',
    });
  } finally {
    client.release();
  }
};

/**
 * Add member to group
 */
exports.addMember = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { userId } = req.body;

    await client.query('BEGIN');

    // Check if group exists
    const groupResult = await client.query(
      'SELECT id FROM groups WHERE id = $1',
      [id]
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user exists
    const userResult = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already a member
    const memberResult = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberResult.rows.length > 0) {
      // Reactivate if inactive
      await client.query(
        'UPDATE group_members SET is_active = true WHERE group_id = $1 AND user_id = $2',
        [id, userId]
      );
    } else {
      // Add as new member
      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
    }

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'MEMBER_ADDED',
      'group_members',
      id,
      null,
      { groupId: id, userId },
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding member',
    });
  } finally {
    client.release();
  }
};

/**
 * Remove member from group
 */
exports.removeMember = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id, userId } = req.params;

    await client.query('BEGIN');

    // Deactivate membership instead of deleting
    const result = await client.query(
      'UPDATE group_members SET is_active = false WHERE group_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Member not found in group',
      });
    }

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'MEMBER_REMOVED',
      'group_members',
      id,
      result.rows[0],
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
    });
  } finally {
    client.release();
  }
};

/**
 * Delete group
 */
exports.deleteGroup = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get group
    const groupResult = await client.query(
      'SELECT * FROM groups WHERE id = $1',
      [id]
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const group = groupResult.rows[0];

    // Soft delete by marking as inactive
    await client.query(
      'UPDATE groups SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'GROUP_DELETED',
      'groups',
      id,
      group,
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
    });
  } finally {
    client.release();
  }
};
