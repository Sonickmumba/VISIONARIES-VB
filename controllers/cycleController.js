const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createBulkNotifications } = require('../utils/notification.util');
const {
  calculateSavingsInterest,
  calculateCommonInterestDistribution,
  calculateShareout: calculateShareoutAmount,
} = require('../utils/interest.util');
const { NOTIFICATION_TYPES, TRANSACTION_TYPES } = require('../config/constants');

/**
 * Create cycle
 */
exports.createCycle = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { groupId, name, startDate, endDate } = req.body;

    await client.query('BEGIN');

    // Verify group exists
    const groupResult = await client.query(
      'SELECT id FROM groups WHERE id = $1 AND is_active = true',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Create cycle
    const result = await client.query(
      `INSERT INTO cycles (group_id, name, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [groupId, name, startDate, endDate]
    );

    const cycle = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'CYCLE_CREATED',
      'cycles',
      cycle.id,
      null,
      cycle,
      req.ip,
      req.headers['user-agent']
    );

    // Notify all group members
    const membersResult = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND is_active = true',
      [groupId]
    );

    const memberIds = membersResult.rows.map(row => row.user_id);
    
    await createBulkNotifications(
      client,
      memberIds,
      NOTIFICATION_TYPES.SYSTEM_ALERT,
      'New Cycle Started',
      `A new savings cycle "${name}" has been started`,
      cycle.id
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Cycle created successfully',
      data: cycle,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating cycle',
    });
  } finally {
    client.release();
  }
};

/**
 * Get cycles by group
 */
exports.getCyclesByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const result = await db.query(
      `SELECT c.*,
              COUNT(DISTINCT s.user_id) as members_saving,
              COUNT(DISTINCT l.id) as total_loans
       FROM cycles c
       LEFT JOIN savings s ON c.id = s.cycle_id AND s.status = 'verified'
       LEFT JOIN loans l ON c.id = l.cycle_id
       WHERE c.group_id = $1
       GROUP BY c.id
       ORDER BY c.start_date DESC`,
      [groupId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get cycles by group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cycles',
    });
  }
};

/**
 * Get cycle by ID
 */
exports.getCycleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get cycle details
    const cycleResult = await db.query(
      `SELECT c.*,
              g.name as group_name
       FROM cycles c
       INNER JOIN groups g ON c.group_id = g.id
       WHERE c.id = $1`,
      [id]
    );

    if (cycleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    // Get summary statistics
    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT s.user_id) as members_saving,
        COUNT(DISTINCT l.id) as total_loans,
        SUM(CASE WHEN l.status = 'repaid' THEN 1 ELSE 0 END) as loans_repaid,
        SUM(CASE WHEN l.status = 'disbursed' THEN 1 ELSE 0 END) as loans_active,
        SUM(CASE WHEN l.status = 'defaulted' THEN 1 ELSE 0 END) as loans_defaulted
       FROM cycles c
       LEFT JOIN savings s ON c.id = s.cycle_id AND s.status = 'verified'
       LEFT JOIN loans l ON c.id = l.cycle_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    const cycle = {
      ...cycleResult.rows[0],
      statistics: statsResult.rows[0] || {},
    };

    res.json({
      success: true,
      data: cycle,
    });
  } catch (error) {
    console.error('Get cycle by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cycle',
    });
  }
};

/**
 * Update cycle
 */
exports.updateCycle = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { name, startDate, endDate } = req.body;

    await client.query('BEGIN');

    // Get existing cycle
    const existingResult = await client.query(
      'SELECT * FROM cycles WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const oldCycle = existingResult.rows[0];

    // Update cycle
    const result = await client.query(
      `UPDATE cycles 
       SET name = COALESCE($1, name),
           start_date = COALESCE($2, start_date),
           end_date = COALESCE($3, end_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, startDate, endDate, id]
    );

    const cycle = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'CYCLE_UPDATED',
      'cycles',
      id,
      oldCycle,
      cycle,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cycle updated successfully',
      data: cycle,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cycle',
    });
  } finally {
    client.release();
  }
};

/**
 * Close cycle
 */
exports.closeCycle = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get cycle
    const cycleResult = await client.query(
      'SELECT * FROM cycles WHERE id = $1',
      [id]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const cycle = cycleResult.rows[0];

    if (cycle.status === 'closed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cycle is already closed',
      });
    }

    // Check for active loans
    const activeLoansResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM loans 
       WHERE cycle_id = $1 AND status IN ('approved', 'disbursed')`,
      [id]
    );

    if (parseInt(activeLoansResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot close cycle with active loans',
      });
    }

    // Calculate and distribute savings interest
    const savingsResult = await client.query(
      `SELECT s.*, u.email
       FROM savings s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.cycle_id = $1 AND s.status = 'verified'
       ORDER BY s.user_id`,
      [id]
    );

    const savings = savingsResult.rows;
    const memberSavingsMap = {}; // Map to aggregate savings by user
    let totalCycleInterest = 0;

    // Calculate interest for each saving and update the savings record
    for (const saving of savings) {
      // Calculate months elapsed (assuming cycle is 12 months)
      const monthsElapsed = 12 - saving.month + 1;
      const interestEarned = calculateSavingsInterest(saving.amount, monthsElapsed);
      totalCycleInterest += interestEarned;

      // Update savings record with calculated interest
      await client.query(
        `UPDATE savings 
         SET interest_earned = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [interestEarned, saving.id]
      );

      // Aggregate member totals
      if (!memberSavingsMap[saving.user_id]) {
        memberSavingsMap[saving.user_id] = {
          userId: saving.user_id,
          email: saving.email,
          totalSavings: 0,
          totalInterest: 0,
        };
      }
      memberSavingsMap[saving.user_id].totalSavings += saving.amount;
      memberSavingsMap[saving.user_id].totalInterest += interestEarned;
    }

    const members = Object.values(memberSavingsMap);
    let totalCommonInterest = 0;

    // Calculate total common interest from loan repayments
    const loanInterestResult = await client.query(
      `SELECT COALESCE(SUM(interest_amount), 0) as total_interest
       FROM loans
       WHERE cycle_id = $1 AND status IN ('repaid', 'defaulted')`,
      [id]
    );

    totalCommonInterest = parseFloat(loanInterestResult.rows[0].total_interest) || 0;

    // Distribute common interest proportionally
    let commonInterestDistributions = [];
    if (members.length > 0 && totalCommonInterest > 0) {
      commonInterestDistributions = calculateCommonInterestDistribution(
        members,
        totalCommonInterest
      );

      // Insert common interest distributions into DB
      for (const distribution of commonInterestDistributions) {
        await client.query(
          `INSERT INTO common_interest_distributions (cycle_id, user_id, amount, notes)
           VALUES ($1, $2, $3, $4)`,
          [id, distribution.userId, distribution.commonInterestShare, 'Cycle closeout distribution']
        );
      }
    }

    // Create shareout records for each member
    for (const member of members) {
      const commonShare = commonInterestDistributions.find(d => d.userId === member.userId);
      const totalAmount = calculateShareoutAmount(
        member.totalSavings,
        member.totalInterest,
        commonShare?.commonInterestShare || 0
      );

      await client.query(
        `INSERT INTO shareouts (cycle_id, user_id, total_savings, total_interest, common_interest, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'calculated')`,
        [id, member.userId, member.totalSavings, member.totalInterest, commonShare?.commonInterestShare || 0, totalAmount]
      );
    }

    // Update cycle totals
    const cycleTotals = {
      total_savings: members.reduce((sum, m) => sum + m.totalSavings, 0),
      total_interest: totalCycleInterest + totalCommonInterest,
    };

    // Close cycle
    const result = await client.query(
      `UPDATE cycles 
       SET status = 'closed',
           closed_at = CURRENT_TIMESTAMP,
           total_savings = $1,
           total_interest = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [cycleTotals.total_savings, cycleTotals.total_interest, id]
    );

    const closedCycle = result.rows[0];

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'CYCLE_CLOSED',
      'cycles',
      id,
      cycle,
      closedCycle,
      req.ip,
      req.headers['user-agent']
    );

    // Notify all group members
    const membersResult = await client.query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND is_active = true',
      [cycle.group_id]
    );

    const memberIds = membersResult.rows.map(row => row.user_id);
    
    await createBulkNotifications(
      client,
      memberIds,
      NOTIFICATION_TYPES.SYSTEM_ALERT,
      'Cycle Closed',
      `The savings cycle "${cycle.name}" has been closed. Total savings: K${cycleTotals.total_savings.toFixed(2)}, Interest: K${cycleTotals.total_interest.toFixed(2)}`,
      id
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cycle closed successfully',
      data: closedCycle,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing cycle',
    });
  } finally {
    client.release();
  }
};

/**
 * Delete cycle
 */
exports.deleteCycle = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get cycle
    const cycleResult = await client.query(
      'SELECT * FROM cycles WHERE id = $1',
      [id]
    );

    if (cycleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const cycle = cycleResult.rows[0];

    // Check for associated data
    const savingsResult = await client.query(
      'SELECT COUNT(*) as count FROM savings WHERE cycle_id = $1',
      [id]
    );

    const loansResult = await client.query(
      'SELECT COUNT(*) as count FROM loans WHERE cycle_id = $1',
      [id]
    );

    if (parseInt(savingsResult.rows[0].count) > 0 || parseInt(loansResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cycle with existing savings or loans',
      });
    }

    // Delete cycle
    await client.query('DELETE FROM cycles WHERE id = $1', [id]);

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'CYCLE_DELETED',
      'cycles',
      id,
      cycle,
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cycle deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cycle',
    });
  } finally {
    client.release();
  }
};

/**
 * Calculate shareout for cycle members
 */
exports.calculateShareout = async (req, res) => {
  try {
    const { id } = req.params;

    const cycleResult = await db.query('SELECT id, name, status FROM cycles WHERE id = $1', [id]);
    if (cycleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cycle not found',
      });
    }

    const savingsResult = await db.query(
      `SELECT
         user_id,
         COALESCE(SUM(amount), 0) AS total_savings,
         COALESCE(SUM(interest_earned), 0) AS savings_interest
       FROM savings
       WHERE cycle_id = $1 AND status = 'verified'
       GROUP BY user_id`,
      [id]
    );

    const commonInterestResult = await db.query(
      `SELECT
         user_id,
         COALESCE(SUM(amount), 0) AS common_interest
       FROM common_interest_distributions
       WHERE cycle_id = $1
       GROUP BY user_id`,
      [id]
    );

    const commonInterestByUser = commonInterestResult.rows.reduce((acc, row) => {
      acc[row.user_id] = Number(row.common_interest || 0);
      return acc;
    }, {});

    const shareouts = savingsResult.rows.map((row) => {
      const totalSavings = Number(row.total_savings || 0);
      const savingsInterest = Number(row.savings_interest || 0);
      const commonInterest = Number(commonInterestByUser[row.user_id] || 0);

      return {
        userId: row.user_id,
        totalSavings,
        savingsInterest,
        commonInterest,
        totalAmount: calculateShareoutAmount(totalSavings, savingsInterest, commonInterest),
      };
    });

    return res.json({
      success: true,
      message: 'Shareout calculated successfully',
      data: {
        cycle: cycleResult.rows[0],
        shareouts,
      },
    });
  } catch (error) {
    console.error('Calculate shareout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error calculating shareout',
    });
  }
};

/**
 * Get cycle statistics
 */
exports.getCycleStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    // Total savings
    const savingsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT user_id) as total_members,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
       FROM savings
       WHERE cycle_id = $1 AND status = 'verified'`,
      [id]
    );

    // Loan statistics
    const loansResult = await db.query(
      `SELECT 
        COUNT(*) as total_loans,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'repaid' THEN 1 ELSE 0 END) as repaid_count,
        SUM(CASE WHEN status = 'disbursed' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'defaulted' THEN 1 ELSE 0 END) as defaulted_count
       FROM loans
       WHERE cycle_id = $1`,
      [id]
    );

    // Interest earned
    const interestResult = await db.query(
      `SELECT 
        SUM(amount) as total_interest
       FROM transactions
       WHERE cycle_id = $1
         AND type IN ($2, $3)`,
      [id, TRANSACTION_TYPES.INTEREST_PAYMENT, TRANSACTION_TYPES.COMMON_INTEREST]
    );

    res.json({
      success: true,
      data: {
        savings: savingsResult.rows[0],
        loans: loansResult.rows[0],
        interest: interestResult.rows[0],
      },
    });
  } catch (error) {
    console.error('Get cycle statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cycle statistics',
    });
  }
};
