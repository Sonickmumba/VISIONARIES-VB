const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createNotification } = require('../utils/notification.util');
const { calculateSavingsInterest } = require('../utils/interest.util');
const { NOTIFICATION_TYPES, TRANSACTION_TYPES } = require('../config/constants');

/**
 * Create savings record
 */
exports.createSavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { cycleId, userId, amount, month, year, proofUrl, notes } = req.body;

    await client.query('BEGIN');

    // Verify cycle exists and is active
    const cycleResult = await client.query(
      'SELECT id, status FROM cycles WHERE id = $1',
      [cycleId]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    if (cycleResult.rows[0].status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cycle is not active',
      });
    }

    // Check if savings already exists for this month
    const existingResult = await client.query(
      'SELECT id FROM savings WHERE cycle_id = $1 AND user_id = $2 AND month = $3 AND year = $4',
      [cycleId, userId, month, year]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Savings already recorded for this month',
      });
    }

    // Create savings record
    const result = await client.query(
      `INSERT INTO savings (cycle_id, user_id, amount, month, year, proof_url, notes, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [cycleId, userId, amount, month, year, proofUrl, notes]
    );

    const savings = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'SAVINGS_CREATED',
      'savings',
      savings.id,
      null,
      savings,
      req.ip,
      req.headers['user-agent']
    );

    // Notify admins
    const adminsResult = await client.query(
      `SELECT u.id FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = (SELECT group_id FROM cycles WHERE id = $1)
       AND u.role IN ('admin', 'super_admin')`,
      [cycleId]
    );

    for (const admin of adminsResult.rows) {
      await createNotification(
        client,
        admin.id,
        NOTIFICATION_TYPES.PAYMENT_DUE,
        'New Savings Submission',
        `A member has submitted savings of K${amount.toFixed(2)} for ${month}/${year}`,
        savings.id
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Savings recorded successfully',
      data: savings,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create savings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording savings',
    });
  } finally {
    client.release();
  }
};

/**
 * Get savings by cycle
 */
exports.getSavingsByCycle = async (req, res) => {
  try {
    const { cycleId } = req.params;

    const result = await db.query(
      `SELECT s.*, 
              u.first_name, u.last_name, u.email,
              v.first_name as verified_by_first_name, v.last_name as verified_by_last_name
       FROM savings s
       INNER JOIN users u ON s.user_id = u.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.cycle_id = $1
       ORDER BY s.year DESC, s.month DESC, u.last_name, u.first_name`,
      [cycleId]
    );

    // Calculate interest for each savings
    const savingsWithInterest = result.rows.map(saving => {
      const monthsElapsed = 12 - saving.month; // Simplified - should calculate from actual dates
      const interest = calculateSavingsInterest(saving.amount, monthsElapsed);
      
      return {
        ...saving,
        interestEarned: interest,
      };
    });

    res.json({
      success: true,
      data: savingsWithInterest,
    });
  } catch (error) {
    console.error('Get savings by cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving savings',
    });
  }
};

/**
 * Get savings by user
 */
exports.getSavingsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT s.*, 
              c.name as cycle_name, c.start_date, c.end_date,
              v.first_name as verified_by_first_name, v.last_name as verified_by_last_name
       FROM savings s
       INNER JOIN cycles c ON s.cycle_id = c.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.user_id = $1
       ORDER BY s.year DESC, s.month DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get savings by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving savings',
    });
  }
};

/**
 * Get savings by ID
 */
exports.getSavingsById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT s.*, 
              u.first_name, u.last_name, u.email, u.phone,
              c.name as cycle_name,
              v.first_name as verified_by_first_name, v.last_name as verified_by_last_name
       FROM savings s
       INNER JOIN users u ON s.user_id = u.id
       INNER JOIN cycles c ON s.cycle_id = c.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Savings record not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get savings by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving savings',
    });
  }
};

/**
 * Update savings
 */
exports.updateSavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { amount, proofUrl, notes } = req.body;

    await client.query('BEGIN');

    // Get existing savings
    const existingResult = await client.query(
      'SELECT * FROM savings WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Savings record not found',
      });
    }

    const oldSavings = existingResult.rows[0];

    // Update savings
    const result = await client.query(
      `UPDATE savings 
       SET amount = COALESCE($1, amount),
           proof_url = COALESCE($2, proof_url),
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [amount, proofUrl, notes, id]
    );

    const savings = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'SAVINGS_UPDATED',
      'savings',
      id,
      oldSavings,
      savings,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Savings updated successfully',
      data: savings,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update savings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating savings',
    });
  } finally {
    client.release();
  }
};

/**
 * Verify savings (Admin only)
 */
exports.verifySavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    await client.query('BEGIN');

    // Get savings record
    const savingsResult = await client.query(
      'SELECT * FROM savings WHERE id = $1',
      [id]
    );

    if (savingsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Savings record not found',
      });
    }

    const savings = savingsResult.rows[0];

    // Update verification status
    const result = await client.query(
      `UPDATE savings 
       SET status = $1,
           verified_by = $2,
           verified_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, notes, id]
    );

    const updatedSavings = result.rows[0];

    // If verified, create transaction and update cycle totals
    if (status === 'verified') {
      // Get current balance
      const balanceResult = await client.query(
        `SELECT COALESCE(SUM(CASE WHEN type IN ('savings', 'loan_repayment', 'interest_payment') THEN amount ELSE -amount END), 0) as balance
         FROM transactions
         WHERE cycle_id = $1 AND user_id = $2`,
        [savings.cycle_id, savings.user_id]
      );

      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      const newBalance = currentBalance + savings.amount;

      // Create transaction
      await client.query(
        `INSERT INTO transactions (cycle_id, user_id, type, amount, balance_after, reference_id, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          savings.cycle_id,
          savings.user_id,
          TRANSACTION_TYPES.SAVINGS,
          savings.amount,
          newBalance,
          savings.id,
          `Savings for ${savings.month}/${savings.year}`,
          req.user.id,
        ]
      );

      // Update cycle totals
      await client.query(
        `UPDATE cycles 
         SET total_savings = total_savings + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [savings.amount, savings.cycle_id]
      );
    }

    // Notify member
    const notificationType = status === 'verified' 
      ? NOTIFICATION_TYPES.PAYMENT_VERIFIED 
      : NOTIFICATION_TYPES.PAYMENT_REJECTED;
    
    const notificationMessage = status === 'verified'
      ? `Your savings of K${savings.amount.toFixed(2)} for ${savings.month}/${savings.year} has been verified`
      : `Your savings submission for ${savings.month}/${savings.year} was rejected. ${notes || ''}`;

    await createNotification(
      client,
      savings.user_id,
      notificationType,
      'Savings Verification',
      notificationMessage,
      id
    );

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'SAVINGS_VERIFIED',
      'savings',
      id,
      savings,
      updatedSavings,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Savings ${status} successfully`,
      data: updatedSavings,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify savings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying savings',
    });
  } finally {
    client.release();
  }
};

/**
 * Delete savings
 */
exports.deleteSavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get savings record
    const savingsResult = await client.query(
      'SELECT * FROM savings WHERE id = $1',
      [id]
    );

    if (savingsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Savings record not found',
      });
    }

    const savings = savingsResult.rows[0];

    // Delete savings
    await client.query('DELETE FROM savings WHERE id = $1', [id]);

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'SAVINGS_DELETED',
      'savings',
      id,
      savings,
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Savings deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete savings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting savings',
    });
  } finally {
    client.release();
  }
};
