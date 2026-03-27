const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createNotification } = require('../utils/notification.util');
const { calculateSavingsInterest } = require('../utils/interest.util');
const { NOTIFICATION_TYPES, TRANSACTION_TYPES, MAX_SAVINGS_PER_CYCLE } = require('../config/constants');

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

/**
 * Create savings record
 */
exports.createSavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { cycleId, userId, amount, month, year, proofUrl, notes } = req.body;
    const savingsAmount = toNumber(amount);

    if (savingsAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Savings amount must be greater than 0',
      });
    }

    await client.query('BEGIN');

    // Verify cycle exists and is active
    const cycleResult = await client.query(
      'SELECT id, status, start_date, end_date FROM cycles WHERE id = $1',
      [cycleId]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const cycle = cycleResult.rows[0];

    if (cycle.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cycle is not active',
      });
    }

    // Validate month/year falls within the cycle's date range
    const savingsDate = new Date(year, month - 1, 1);
    const cycleStart = new Date(cycle.start_date);
    const cycleEnd = new Date(cycle.end_date);
    if (savingsDate < new Date(cycleStart.getFullYear(), cycleStart.getMonth(), 1) ||
        savingsDate > new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), 1)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Month ${month}/${year} is outside the cycle period`,
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

    // Enforce per-cycle savings cap
    const totalResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE cycle_id = $1 AND user_id = $2',
      [cycleId, userId]
    );
    const currentTotal = parseFloat(totalResult.rows[0].total);
    if (currentTotal + savingsAmount > MAX_SAVINGS_PER_CYCLE) {
      const remaining = MAX_SAVINGS_PER_CYCLE - currentTotal;
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Savings would exceed the K${MAX_SAVINGS_PER_CYCLE.toLocaleString()} per-cycle limit. Remaining allowance: K${remaining.toLocaleString()}`,
      });
    }

    // Create savings record
    const result = await client.query(
      `INSERT INTO savings (cycle_id, user_id, amount, month, year, proof_url, notes, payment_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [cycleId, userId, savingsAmount, month, year, proofUrl, notes]
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
        `A member has submitted savings of K${savingsAmount.toFixed(2)} for ${month}/${year}`,
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
              u.name as user_name, u.email,
              v.name as verified_by_name
       FROM savings s
       INNER JOIN users u ON s.user_id = u.id
       LEFT JOIN users v ON s.verified_by = v.id
       WHERE s.cycle_id = $1
       ORDER BY s.year DESC, s.month DESC, u.name`,
      [cycleId]
    );

    // Calculate interest for each savings
    const savingsWithInterest = result.rows.map(saving => {
      const monthsElapsed = 12 - saving.month; // Simplified - should calculate from actual dates
      const interest = calculateSavingsInterest(toNumber(saving.amount), monthsElapsed);
      
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
              v.name as verified_by_name
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
              u.name as user_name, u.email, u.phone,
              c.name as cycle_name,
              v.name as verified_by_name
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
  const savingsAmount = toNumber(savings.amount);

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

      const currentBalance = toNumber(balanceResult.rows[0].balance);
      const newBalance = currentBalance + savingsAmount;

      // Create transaction
      await client.query(
        `INSERT INTO transactions (cycle_id, user_id, type, amount, balance_after, reference_id, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          savings.cycle_id,
          savings.user_id,
          TRANSACTION_TYPES.SAVINGS,
          savingsAmount,
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
        [savingsAmount, savings.cycle_id]
      );
    }

    // Notify member
    const notificationType = status === 'verified' 
      ? NOTIFICATION_TYPES.PAYMENT_VERIFIED 
      : NOTIFICATION_TYPES.PAYMENT_REJECTED;
    
    const notificationMessage = status === 'verified'
      ? `Your savings of K${savingsAmount.toFixed(2)} for ${savings.month}/${savings.year} has been verified`
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

/**
 * Create savings records for multiple members in a single transaction
 */
exports.createBulkSavings = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { cycleId, month, year, entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one savings entry is required',
      });
    }

    await client.query('BEGIN');

    // Verify cycle exists and is active
    const cycleResult = await client.query(
      'SELECT id, group_id, status, start_date, end_date FROM cycles WHERE id = $1',
      [cycleId]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Cycle not found' });
    }

    const cycle = cycleResult.rows[0];

    if (cycle.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cycle is not active' });
    }

    const groupId = cycle.group_id;

    // Validate month/year falls within the cycle's date range
    const savingsDate = new Date(year, month - 1, 1);
    const cycleStart = new Date(cycle.start_date);
    const cycleEnd = new Date(cycle.end_date);
    if (savingsDate < new Date(cycleStart.getFullYear(), cycleStart.getMonth(), 1) ||
        savingsDate > new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), 1)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Month ${month}/${year} is outside the cycle period`,
      });
    }

    // Check for any existing savings in this period for these users
    const userIds = entries.map((e) => e.userId);
    const existingResult = await client.query(
      `SELECT user_id FROM savings
       WHERE cycle_id = $1 AND month = $2 AND year = $3 AND user_id = ANY($4::uuid[])`,
      [cycleId, month, year, userIds]
    );

    if (existingResult.rows.length > 0) {
      const dupes = existingResult.rows.map((r) => r.user_id);
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Some members already have savings recorded for this month',
        duplicateUserIds: dupes,
      });
    }

    // Enforce per-cycle savings cap for each member
    const totalsResult = await client.query(
      `SELECT user_id, COALESCE(SUM(amount), 0) AS total
       FROM savings WHERE cycle_id = $1 AND user_id = ANY($2::uuid[])
       GROUP BY user_id`,
      [cycleId, userIds]
    );
    const totalMap = new Map(totalsResult.rows.map((r) => [r.user_id, parseFloat(r.total)]));
    const overLimitUsers = [];
    for (const entry of entries) {
      const current = totalMap.get(entry.userId) || 0;
      if (current + toNumber(entry.amount) > MAX_SAVINGS_PER_CYCLE) {
        overLimitUsers.push({ userId: entry.userId, current, attempted: toNumber(entry.amount), remaining: MAX_SAVINGS_PER_CYCLE - current });
      }
    }
    if (overLimitUsers.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Some members would exceed the K${MAX_SAVINGS_PER_CYCLE.toLocaleString()} per-cycle limit`,
        overLimitUsers,
      });
    }

    // Batch insert via unnest for performance
    const amounts = [];
    const uids = [];
    const notes = [];
    for (const entry of entries) {
      const amt = toNumber(entry.amount);
      if (amt <= 0) continue;
      amounts.push(amt);
      uids.push(entry.userId);
      notes.push(entry.notes || null);
    }

    if (amounts.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No valid savings amounts provided',
      });
    }

    const insertResult = await client.query(
      `INSERT INTO savings (cycle_id, user_id, amount, month, year, notes, payment_date)
       SELECT $1, uid, amt, $2, $3, n, CURRENT_TIMESTAMP
       FROM unnest($4::uuid[], $5::numeric[], $6::text[]) AS t(uid, amt, n)
       RETURNING *`,
      [cycleId, month, year, uids, amounts, notes]
    );

    const created = insertResult.rows;

    // Audit log for the batch
    await logAudit(
      client,
      req.user.id,
      'BULK_SAVINGS_CREATED',
      'savings',
      null,
      null,
      { count: created.length, cycleId, month, year },
      req.ip,
      req.headers['user-agent']
    );

    // Notify admins
    const adminsResult = await client.query(
      `SELECT u.id FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       AND u.role IN ('admin', 'super_admin')`,
      [groupId]
    );

    for (const admin of adminsResult.rows) {
      await createNotification(
        client,
        admin.id,
        NOTIFICATION_TYPES.PAYMENT_DUE,
        'Bulk Savings Submission',
        `${created.length} savings entries submitted for ${month}/${year}`,
        null
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${created.length} savings recorded successfully`,
      data: created,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create bulk savings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording bulk savings',
    });
  } finally {
    client.release();
  }
};
