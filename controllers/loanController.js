const db = require('../config/database');
const { logAudit } = require('../utils/audit.util');
const { createNotification } = require('../utils/notification.util');
const { calculateLoanInterest } = require('../utils/interest.util');
const { NOTIFICATION_TYPES, LOAN_STATUS, TRANSACTION_TYPES } = require('../config/constants');

/**
 * Create loan application
 */
exports.createLoan = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { cycleId, amount, purpose } = req.body;
    const userId = req.user.id;

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

    // Calculate interest (minimum K3,000)
    const interestAmount = calculateLoanInterest(amount);
    const totalAmount = amount + interestAmount;

    // Create loan application
    const result = await client.query(
      `INSERT INTO loans (cycle_id, user_id, amount, interest_amount, total_amount, purpose, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [cycleId, userId, amount, interestAmount, totalAmount, purpose, LOAN_STATUS.PENDING]
    );

    const loan = result.rows[0];

    // Log audit
    await logAudit(
      client,
      userId,
      'LOAN_CREATED',
      'loans',
      loan.id,
      null,
      loan,
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
        NOTIFICATION_TYPES.SYSTEM_ALERT,
        'New Loan Application',
        `A member has applied for a loan of K${amount.toFixed(2)}`,
        loan.id
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: loan,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating loan application',
    });
  } finally {
    client.release();
  }
};

/**
 * Get loans by cycle
 */
exports.getLoansByCycle = async (req, res) => {
  try {
    const { cycleId } = req.params;

    const result = await db.query(
      `SELECT l.*, 
              u.first_name, u.last_name, u.email,
              a.first_name as approved_by_first_name, a.last_name as approved_by_last_name
       FROM loans l
       INNER JOIN users u ON l.user_id = u.id
       LEFT JOIN users a ON l.approved_by = a.id
       WHERE l.cycle_id = $1
       ORDER BY l.requested_date DESC`,
      [cycleId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get loans by cycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving loans',
    });
  }
};

/**
 * Get loans by user
 */
exports.getLoansByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT l.*, 
              c.name as cycle_name, c.start_date, c.end_date,
              a.first_name as approved_by_first_name, a.last_name as approved_by_last_name
       FROM loans l
       INNER JOIN cycles c ON l.cycle_id = c.id
       LEFT JOIN users a ON l.approved_by = a.id
       WHERE l.user_id = $1
       ORDER BY l.requested_date DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get loans by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving loans',
    });
  }
};

/**
 * Get loan by ID
 */
exports.getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT l.*, 
              u.first_name, u.last_name, u.email, u.phone,
              c.name as cycle_name,
              a.first_name as approved_by_first_name, a.last_name as approved_by_last_name
       FROM loans l
       INNER JOIN users u ON l.user_id = u.id
       INNER JOIN cycles c ON l.cycle_id = c.id
       LEFT JOIN users a ON l.approved_by = a.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Get repayments
    const repaymentsResult = await db.query(
      `SELECT lr.*, 
              v.first_name as verified_by_first_name, v.last_name as verified_by_last_name
       FROM loan_repayments lr
       LEFT JOIN users v ON lr.verified_by = v.id
       WHERE lr.loan_id = $1
       ORDER BY lr.payment_date DESC`,
      [id]
    );

    const loan = {
      ...result.rows[0],
      repayments: repaymentsResult.rows,
    };

    res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    console.error('Get loan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving loan',
    });
  }
};

/**
 * Approve/Reject loan (Admin only)
 */
exports.approveLoan = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    await client.query('BEGIN');

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [id]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LOAN_STATUS.PENDING) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Loan has already been processed',
      });
    }

    // Update loan status
    const result = await client.query(
      `UPDATE loans 
       SET status = $1,
           approved_by = $2,
           approved_date = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status === 'approved' ? LOAN_STATUS.APPROVED : 'rejected', req.user.id, notes, id]
    );

    const updatedLoan = result.rows[0];

    // Notify member
    const notificationType = status === 'approved'
      ? NOTIFICATION_TYPES.LOAN_APPROVED
      : NOTIFICATION_TYPES.LOAN_REJECTED;

    const notificationMessage = status === 'approved'
      ? `Your loan application of K${loan.amount.toFixed(2)} has been approved`
      : `Your loan application of K${loan.amount.toFixed(2)} was rejected. ${notes || ''}`;

    await createNotification(
      client,
      loan.user_id,
      notificationType,
      'Loan Application Update',
      notificationMessage,
      id
    );

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'LOAN_APPROVED',
      'loans',
      id,
      loan,
      updatedLoan,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Loan ${status} successfully`,
      data: updatedLoan,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing loan',
    });
  } finally {
    client.release();
  }
};

/**
 * Disburse loan (Admin only)
 */
exports.disburseLoan = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [id]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LOAN_STATUS.APPROVED) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Loan must be approved before disbursement',
      });
    }

    // Update loan status
    const result = await client.query(
      `UPDATE loans 
       SET status = $1,
           disbursed_date = CURRENT_TIMESTAMP,
           due_date = CURRENT_DATE + INTERVAL '30 days',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [LOAN_STATUS.DISBURSED, id]
    );

    const updatedLoan = result.rows[0];

    // Get current balance
    const balanceResult = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN type IN ('savings', 'loan_repayment', 'interest_payment') THEN amount ELSE -amount END), 0) as balance
       FROM transactions
       WHERE cycle_id = $1 AND user_id = $2`,
      [loan.cycle_id, loan.user_id]
    );

    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance - loan.amount;

    // Create transaction for loan disbursement
    await client.query(
      `INSERT INTO transactions (cycle_id, user_id, type, amount, balance_after, reference_id, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        loan.cycle_id,
        loan.user_id,
        TRANSACTION_TYPES.LOAN_DISBURSEMENT,
        loan.amount,
        newBalance,
        loan.id,
        `Loan disbursement - K${loan.amount.toFixed(2)}`,
        req.user.id,
      ]
    );

    // Notify member
    await createNotification(
      client,
      loan.user_id,
      NOTIFICATION_TYPES.SYSTEM_ALERT,
      'Loan Disbursed',
      `Your loan of K${loan.amount.toFixed(2)} has been disbursed. Total repayment: K${loan.total_amount.toFixed(2)}`,
      id
    );

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'LOAN_DISBURSED',
      'loans',
      id,
      loan,
      updatedLoan,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Loan disbursed successfully',
      data: updatedLoan,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Disburse loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disbursing loan',
    });
  } finally {
    client.release();
  }
};

/**
 * Repay loan
 */
exports.repayLoan = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;
    const { amount, proofUrl, notes } = req.body;

    await client.query('BEGIN');

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [id]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    if (loan.status !== LOAN_STATUS.DISBURSED && loan.status !== LOAN_STATUS.REPAID) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Loan must be disbursed before repayment',
      });
    }

    // Create repayment record
    const result = await client.query(
      `INSERT INTO loan_repayments (loan_id, amount, proof_url, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, amount, proofUrl, notes]
    );

    const repayment = result.rows[0];

    // Notify admins
    const adminsResult = await client.query(
      `SELECT u.id FROM users u
       INNER JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = (SELECT group_id FROM cycles WHERE id = $1)
       AND u.role IN ('admin', 'super_admin')`,
      [loan.cycle_id]
    );

    for (const admin of adminsResult.rows) {
      await createNotification(
        client,
        admin.id,
        NOTIFICATION_TYPES.PAYMENT_DUE,
        'Loan Repayment Submitted',
        `A member has submitted a loan repayment of K${amount.toFixed(2)}`,
        repayment.id
      );
    }

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'LOAN_REPAYMENT_CREATED',
      'loan_repayments',
      repayment.id,
      null,
      repayment,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Loan repayment submitted successfully',
      data: repayment,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Repay loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting loan repayment',
    });
  } finally {
    client.release();
  }
};

/**
 * Verify loan repayment (Admin only)
 */
exports.verifyRepayment = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id, repaymentId } = req.params;
    const { status, notes } = req.body;

    await client.query('BEGIN');

    // Get repayment
    const repaymentResult = await client.query(
      'SELECT * FROM loan_repayments WHERE id = $1 AND loan_id = $2',
      [repaymentId, id]
    );

    if (repaymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Repayment not found',
      });
    }

    const repayment = repaymentResult.rows[0];

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [id]
    );

    const loan = loanResult.rows[0];

    // Update repayment status
    await client.query(
      `UPDATE loan_repayments 
       SET status = $1,
           verified_by = $2,
           verified_at = CURRENT_TIMESTAMP,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, req.user.id, notes, repaymentId]
    );

    // If verified, update loan and create transaction
    if (status === 'verified') {
      const newAmountRepaid = parseFloat(loan.amount_repaid) + parseFloat(repayment.amount);
      const isFullyRepaid = newAmountRepaid >= parseFloat(loan.total_amount);

      // Update loan
      await client.query(
        `UPDATE loans 
         SET amount_repaid = $1,
             status = $2,
             repayment_date = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          newAmountRepaid,
          isFullyRepaid ? LOAN_STATUS.REPAID : loan.status,
          isFullyRepaid ? new Date() : null,
          id,
        ]
      );

      // Get current balance
      const balanceResult = await client.query(
        `SELECT COALESCE(SUM(CASE WHEN type IN ('savings', 'loan_repayment', 'interest_payment') THEN amount ELSE -amount END), 0) as balance
         FROM transactions
         WHERE cycle_id = $1 AND user_id = $2`,
        [loan.cycle_id, loan.user_id]
      );

      const currentBalance = parseFloat(balanceResult.rows[0].balance);
      const newBalance = currentBalance + parseFloat(repayment.amount);

      // Create transaction
      await client.query(
        `INSERT INTO transactions (cycle_id, user_id, type, amount, balance_after, reference_id, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          loan.cycle_id,
          loan.user_id,
          TRANSACTION_TYPES.LOAN_REPAYMENT,
          repayment.amount,
          newBalance,
          repaymentId,
          `Loan repayment - K${repayment.amount.toFixed(2)}`,
          req.user.id,
        ]
      );

      // Update cycle interest
      await client.query(
        `UPDATE cycles 
         SET total_interest = total_interest + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [loan.interest_amount, loan.cycle_id]
      );

      // Notify member
      const notificationMessage = isFullyRepaid
        ? `Your loan has been fully repaid. Thank you!`
        : `Your loan repayment of K${repayment.amount.toFixed(2)} has been verified`;

      await createNotification(
        client,
        loan.user_id,
        NOTIFICATION_TYPES.PAYMENT_VERIFIED,
        'Loan Repayment Verified',
        notificationMessage,
        repaymentId
      );
    } else {
      // Notify member of rejection
      await createNotification(
        client,
        loan.user_id,
        NOTIFICATION_TYPES.PAYMENT_REJECTED,
        'Loan Repayment Rejected',
        `Your loan repayment was rejected. ${notes || ''}`,
        repaymentId
      );
    }

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'LOAN_REPAYMENT_VERIFIED',
      'loan_repayments',
      repaymentId,
      repayment,
      { status, notes },
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Loan repayment ${status} successfully`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify repayment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying repayment',
    });
  } finally {
    client.release();
  }
};

/**
 * Delete loan
 */
exports.deleteLoan = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get loan
    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1',
      [id]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    // Delete loan
    await client.query('DELETE FROM loans WHERE id = $1', [id]);

    // Log audit
    await logAudit(
      client,
      req.user.id,
      'LOAN_DELETED',
      'loans',
      id,
      loan,
      null,
      req.ip,
      req.headers['user-agent']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Loan deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting loan',
    });
  } finally {
    client.release();
  }
};
