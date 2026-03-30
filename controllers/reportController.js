const db = require('../config/database');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

// Get monthly report data
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.params;
    const { cycleId } = req.query;

    // Validate parameters
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month parameters'
      });
    }

    // Get month name and date range
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // Last day of month

    // Execute all queries in parallel for better performance
    const [
      savingsResult,
      loansResult,
      repaymentsResult,
      interestResult,
      memberActivityResult
    ] = await Promise.all([
      getMonthlySavings(yearNum, monthNum, cycleId),
      getMonthlyLoans(yearNum, monthNum, cycleId),
      getMonthlyRepayments(yearNum, monthNum, cycleId),
      getMonthlyInterest(yearNum, monthNum, cycleId),
      getMemberActivity(yearNum, monthNum, cycleId)
    ]);

    // Calculate summary statistics
    const summary = {
      totalSavings: savingsResult.totalAmount,
      totalLoansDisbursed: loansResult.disbursed.totalAmount,
      totalRepayments: repaymentsResult.totalAmount,
      totalInterestDistributed: interestResult.totalAmount,
      activeMembers: memberActivityResult.filter(m => m.monthlySavings > 0 || m.monthlyLoans > 0 || m.monthlyRepayments > 0).length,
      newLoans: loansResult.disbursed.count,
      completedRepayments: repaymentsResult.count
    };

    const response = {
      success: true,
      data: {
        period: {
          year: yearNum,
          month: monthNum,
          monthName: monthNames[monthNum - 1],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        summary,
        savings: savingsResult,
        loans: loansResult,
        repayments: repaymentsResult,
        interest: interestResult,
        memberActivity: memberActivityResult
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optimized query for monthly savings
const getMonthlySavings = async (year, month, cycleId) => {
  const cycleFilter = cycleId ? 'AND s.cycle_id = $3' : '';
  const params = cycleId ? [year, month, cycleId] : [year, month];

  const [summaryQuery, detailsQuery] = await Promise.all([
    // Summary query
    db.query(`
      SELECT
        COUNT(DISTINCT s.user_id) as member_count,
        COALESCE(SUM(s.amount), 0) as total_amount,
        ROUND(COALESCE(AVG(s.amount), 0), 2) as average_amount
      FROM savings s
      WHERE EXTRACT(YEAR FROM s.payment_date) = $1
        AND EXTRACT(MONTH FROM s.payment_date) = $2
        AND s.status = 'verified'
        ${cycleFilter}
    `, params),

    // Detailed breakdown by member
    db.query(`
      SELECT
        u.id,
        u.name,
        u.member_no,
        COALESCE(SUM(s.amount), 0) as amount,
        COUNT(s.id) as contribution_count
      FROM users u
      LEFT JOIN savings s ON u.id = s.user_id
        AND EXTRACT(YEAR FROM s.payment_date) = $1
        AND EXTRACT(MONTH FROM s.payment_date) = $2
        AND s.status = 'verified'
        ${cycleFilter}
      WHERE u.role = 'member' AND u.is_active = true
      GROUP BY u.id, u.name, u.member_no
      HAVING COALESCE(SUM(s.amount), 0) > 0
      ORDER BY COALESCE(SUM(s.amount), 0) DESC
    `, params)
  ]);

  return {
    totalAmount: parseFloat(summaryQuery.rows[0].total_amount) || 0,
    memberCount: parseInt(summaryQuery.rows[0].member_count) || 0,
    averagePerMember: parseFloat(summaryQuery.rows[0].average_amount) || 0,
    byMember: detailsQuery.rows.map(row => ({
      id: row.id,
      name: row.name,
      memberNo: row.member_no,
      amount: parseFloat(row.amount),
      contributionCount: parseInt(row.contribution_count)
    }))
  };
};

// Optimized query for monthly loans
const getMonthlyLoans = async (year, month, cycleId) => {
  const cycleFilter = cycleId ? 'AND l.cycle_id = $3' : '';
  const params = cycleId ? [year, month, cycleId] : [year, month];

  const [disbursedQuery, repaymentsQuery] = await Promise.all([
    // Disbursed loans
    db.query(`
      SELECT
        COUNT(*) as loan_count,
        COALESCE(SUM(l.amount), 0) as total_amount,
        ROUND(COALESCE(AVG(l.amount), 0), 2) as average_amount
      FROM loans l
      WHERE EXTRACT(YEAR FROM l.disbursed_date) = $1
        AND EXTRACT(MONTH FROM l.disbursed_date) = $2
        AND l.status = 'disbursed'
        ${cycleFilter}
    `, params),

    // Loan repayments
    db.query(`
      SELECT
        COUNT(lr.id) as repayment_count,
        COALESCE(SUM(lr.amount), 0) as total_amount,
        ROUND(COALESCE(AVG(lr.amount), 0), 2) as average_amount
      FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE EXTRACT(YEAR FROM lr.payment_date) = $1
        AND EXTRACT(MONTH FROM lr.payment_date) = $2
        AND lr.status = 'verified'
        ${cycleFilter}
    `, params)
  ]);

  // Get detailed disbursements
  const disbursementsDetails = await db.query(`
    SELECT
      l.id,
      u.name,
      u.member_no,
      l.amount,
      l.purpose,
      l.disbursed_date
    FROM loans l
    JOIN users u ON l.user_id = u.id
    WHERE EXTRACT(YEAR FROM l.disbursed_date) = $1
      AND EXTRACT(MONTH FROM l.disbursed_date) = $2
      AND l.status = 'disbursed'
      ${cycleFilter}
    ORDER BY l.disbursed_date DESC
  `, params);

  return {
    disbursed: {
      totalAmount: parseFloat(disbursedQuery.rows[0].total_amount) || 0,
      count: parseInt(disbursedQuery.rows[0].loan_count) || 0,
      averageAmount: parseFloat(disbursedQuery.rows[0].average_amount) || 0,
      byMember: disbursementsDetails.rows.map(row => ({
        id: row.id,
        name: row.name,
        memberNo: row.member_no,
        amount: parseFloat(row.amount),
        purpose: row.purpose,
        disbursedDate: row.disbursed_date
      }))
    },
    repayments: {
      totalAmount: parseFloat(repaymentsQuery.rows[0].total_amount) || 0,
      count: parseInt(repaymentsQuery.rows[0].repayment_count) || 0,
      averageAmount: parseFloat(repaymentsQuery.rows[0].average_amount) || 0
    }
  };
};

// Optimized query for monthly repayments (detailed)
const getMonthlyRepayments = async (year, month, cycleId) => {
  const cycleFilter = cycleId ? 'AND l.cycle_id = $3' : '';
  const params = cycleId ? [year, month, cycleId] : [year, month];

  const repaymentsDetails = await db.query(`
    SELECT
      lr.id,
      u.name,
      u.member_no,
      lr.amount,
      lr.payment_date,
      l.amount as loan_amount
    FROM loan_repayments lr
    JOIN loans l ON lr.loan_id = l.id
    JOIN users u ON l.user_id = u.id
    WHERE EXTRACT(YEAR FROM lr.payment_date) = $1
      AND EXTRACT(MONTH FROM lr.payment_date) = $2
      AND lr.status = 'verified'
      ${cycleFilter}
    ORDER BY lr.payment_date DESC
  `, params);

  const totalAmount = repaymentsDetails.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

  return {
    totalAmount,
    count: repaymentsDetails.rows.length,
    averageAmount: repaymentsDetails.rows.length > 0 ? totalAmount / repaymentsDetails.rows.length : 0,
    byMember: repaymentsDetails.rows.map(row => ({
      id: row.id,
      name: row.name,
      memberNo: row.member_no,
      amount: parseFloat(row.amount),
      paymentDate: row.payment_date,
      loanAmount: parseFloat(row.loan_amount)
    }))
  };
};

// Optimized query for monthly interest distributions
const getMonthlyInterest = async (year, month, cycleId) => {
  const cycleFilter = cycleId ? 'AND cid.cycle_id = $3' : '';
  const params = cycleId ? [year, month, cycleId] : [year, month];

  const [summaryQuery, detailsQuery] = await Promise.all([
    // Summary
    db.query(`
      SELECT
        COUNT(*) as distribution_count,
        COALESCE(SUM(cid.amount), 0) as total_amount,
        ROUND(COALESCE(AVG(cid.amount), 0), 2) as average_amount
      FROM common_interest_distributions cid
      WHERE EXTRACT(YEAR FROM cid.distribution_date) = $1
        AND EXTRACT(MONTH FROM cid.distribution_date) = $2
        ${cycleFilter}
    `, params),

    // Details by member
    db.query(`
      SELECT
        u.id,
        u.name,
        u.member_no,
        COALESCE(SUM(cid.amount), 0) as amount,
        COUNT(cid.id) as distribution_count
      FROM users u
      LEFT JOIN common_interest_distributions cid ON u.id = cid.user_id
        AND EXTRACT(YEAR FROM cid.distribution_date) = $1
        AND EXTRACT(MONTH FROM cid.distribution_date) = $2
        ${cycleFilter}
      WHERE u.role = 'member' AND u.is_active = true
      GROUP BY u.id, u.name, u.member_no
      HAVING COALESCE(SUM(cid.amount), 0) > 0
      ORDER BY COALESCE(SUM(cid.amount), 0) DESC
    `, params)
  ]);

  return {
    totalAmount: parseFloat(summaryQuery.rows[0].total_amount) || 0,
    distributionCount: parseInt(summaryQuery.rows[0].distribution_count) || 0,
    averageAmount: parseFloat(summaryQuery.rows[0].average_amount) || 0,
    byMember: detailsQuery.rows.map(row => ({
      id: row.id,
      name: row.name,
      memberNo: row.member_no,
      amount: parseFloat(row.amount),
      distributionCount: parseInt(row.distribution_count)
    }))
  };
};

// Optimized query for member activity summary
const getMemberActivity = async (year, month, cycleId) => {
  const cycleFilter = cycleId ? 'AND cycle_id = $4' : '';
  const params = cycleId ? [year, month, year, month, cycleId] : [year, month, year, month];

  const query = `
    SELECT
      u.id,
      u.name,
      u.member_no,
      COALESCE(s.total_savings, 0) as monthly_savings,
      COALESCE(l.total_loans, 0) as monthly_loans,
      COALESCE(r.total_repayments, 0) as monthly_repayments,
      COALESCE(i.total_interest, 0) as monthly_interest
    FROM users u
    LEFT JOIN (
      SELECT user_id, SUM(amount) as total_savings
      FROM savings
      WHERE EXTRACT(YEAR FROM payment_date) = $1
        AND EXTRACT(MONTH FROM payment_date) = $2
        AND status = 'verified'
        ${cycleFilter}
      GROUP BY user_id
    ) s ON u.id = s.user_id
    LEFT JOIN (
      SELECT user_id, SUM(amount) as total_loans
      FROM loans
      WHERE EXTRACT(YEAR FROM disbursed_date) = $1
        AND EXTRACT(MONTH FROM disbursed_date) = $2
        AND status = 'disbursed'
        ${cycleFilter}
      GROUP BY user_id
    ) l ON u.id = l.user_id
    LEFT JOIN (
      SELECT l.user_id, SUM(lr.amount) as total_repayments
      FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE EXTRACT(YEAR FROM lr.payment_date) = $1
        AND EXTRACT(MONTH FROM lr.payment_date) = $2
        AND lr.status = 'verified'
        ${cycleFilter}
      GROUP BY l.user_id
    ) r ON u.id = r.user_id
    LEFT JOIN (
      SELECT user_id, SUM(amount) as total_interest
      FROM common_interest_distributions
      WHERE EXTRACT(YEAR FROM distribution_date) = $3
        AND EXTRACT(MONTH FROM distribution_date) = $4
        ${cycleFilter}
      GROUP BY user_id
    ) i ON u.id = i.user_id
    WHERE u.role = 'member' AND u.is_active = true
    ORDER BY (COALESCE(s.total_savings, 0) + COALESCE(l.total_loans, 0) + COALESCE(r.total_repayments, 0) + COALESCE(i.total_interest, 0)) DESC
  `;

  const result = await db.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    memberNo: row.member_no,
    monthlySavings: parseFloat(row.monthly_savings) || 0,
    monthlyLoans: parseFloat(row.monthly_loans) || 0,
    monthlyRepayments: parseFloat(row.monthly_repayments) || 0,
    monthlyInterest: parseFloat(row.monthly_interest) || 0,
    totalActivity: (parseFloat(row.monthly_savings) || 0) +
                   (parseFloat(row.monthly_loans) || 0) +
                   (parseFloat(row.monthly_repayments) || 0) +
                   (parseFloat(row.monthly_interest) || 0)
  }));
};

// Send monthly report via email
const sendMonthlyReportEmail = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { year, month } = req.params;
    const { recipientEmail, subject, includeDetails } = req.body;

    // Get report data
    const reportResponse = await getMonthlyReport(req, { json: (data) => data });
    if (!reportResponse.success) {
      return res.status(400).json(reportResponse);
    }

    const reportData = reportResponse.data;

    // Generate HTML email content
    const htmlContent = generateMonthlyReportHTML(reportData, includeDetails);

    // Send email (using nodemailer - configure SMTP in environment variables)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject: subject,
      html: htmlContent
    };

    // In development/demo mode, just log the email content
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
      console.log('Monthly Report Email Content:');
      console.log('To:', recipientEmail);
      console.log('Subject:', subject);
      console.log('HTML Content:', htmlContent);

      return res.json({
        success: true,
        message: 'Report prepared successfully (email not sent in demo mode)',
        data: {
          recipient: recipientEmail,
          subject: subject,
          summary: {
            totalMembers: reportData.memberActivity.length,
            totalSavings: reportData.summary.totalSavings,
            totalLoans: reportData.summary.totalLoansDisbursed,
            totalRepayments: reportData.summary.totalRepayments,
            totalInterest: reportData.summary.totalInterestDistributed
          }
        }
      });
    }

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Monthly report sent successfully',
      data: {
        recipient: recipientEmail,
        subject: subject,
        summary: {
          totalMembers: reportData.memberActivity.length,
          totalSavings: reportData.summary.totalSavings,
          totalLoans: reportData.summary.totalLoansDisbursed,
          totalRepayments: reportData.summary.totalRepayments,
          totalInterest: reportData.summary.totalInterestDistributed
        }
      }
    });
  } catch (error) {
    console.error('Error sending monthly report email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send monthly report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate HTML content for monthly report email
const generateMonthlyReportHTML = (reportData, includeDetails) => {
  const { period, summary, savings, loans, repayments, interest, memberActivity } = reportData;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1f2937; text-align: center; margin-bottom: 10px;">
        📊 Monthly Report - ${period.monthName} ${period.year}
      </h1>
      <p style="color: #6b7280; text-align: center; margin-bottom: 30px;">
        ${period.startDate} to ${period.endDate}
      </p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="color: #1f2937; margin-bottom: 15px;">Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #059669;">K ${summary.totalSavings.toLocaleString()}</div>
            <div style="color: #6b7280; font-size: 14px;">Total Savings</div>
            <div style="color: #6b7280; font-size: 12px;">${summary.activeMembers} active members</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">K ${summary.totalLoansDisbursed.toLocaleString()}</div>
            <div style="color: #6b7280; font-size: 14px;">Loans Disbursed</div>
            <div style="color: #6b7280; font-size: 12px;">${summary.newLoans} new loans</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #0891b2;">K ${summary.totalRepayments.toLocaleString()}</div>
            <div style="color: #6b7280; font-size: 14px;">Repayments</div>
            <div style="color: #6b7280; font-size: 12px;">${summary.completedRepayments} repayments</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">K ${summary.totalInterestDistributed.toLocaleString()}</div>
            <div style="color: #6b7280; font-size: 14px;">Interest Distributed</div>
          </div>
        </div>
      </div>

      ${includeDetails ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">Monthly Savings</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #d1d5db;">Member</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #d1d5db;">Amount</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #d1d5db;">Contributions</th>
              </tr>
            </thead>
            <tbody>
              ${savings.byMember.slice(0, 10).map(member => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${member.name} (${member.memberNo})</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${member.amount.toLocaleString()}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${member.contributionCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px;">Loan Activity</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3 style="color: #dc2626; margin-bottom: 10px;">Disbursements</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #fef2f2;">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #fecaca;">Member</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #fecaca;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${loans.disbursed.byMember.slice(0, 5).map(loan => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${loan.name}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${loan.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div>
              <h3 style="color: #0891b2; margin-bottom: 10px;">Repayments</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #ecfeff;">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #a5f3fc;">Member</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 1px solid #a5f3fc;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${repayments.byMember.slice(0, 5).map(repayment => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${repayment.name}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${repayment.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <p style="margin-top: 40px; font-size: 12px; color: #6b7280; text-align: center;">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </p>
    </div>
  `;
};

module.exports = {
  getMonthlyReport,
  sendMonthlyReportEmail
};