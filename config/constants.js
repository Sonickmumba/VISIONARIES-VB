module.exports = {
  // User Roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MEMBER: 'member',
  },

  // Transaction Types
  TRANSACTION_TYPES: {
    SAVINGS: 'savings',
    LOAN_DISBURSEMENT: 'loan_disbursement',
    LOAN_REPAYMENT: 'loan_repayment',
    INTEREST_PAYMENT: 'interest_payment',
    COMMON_INTEREST: 'common_interest',
    SHAREOUT: 'shareout',
    FINE: 'fine',
  },

  // Loan Status
  LOAN_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    DISBURSED: 'disbursed',
    REPAID: 'repaid',
    DEFAULTED: 'defaulted',
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    PAYMENT_DUE: 'payment_due',
    PAYMENT_VERIFIED: 'payment_verified',
    PAYMENT_REJECTED: 'payment_rejected',
    LOAN_APPROVED: 'loan_approved',
    LOAN_REJECTED: 'loan_rejected',
    CYCLE_ENDING: 'cycle_ending',
    SHAREOUT_READY: 'shareout_ready',
    SYSTEM_ALERT: 'system_alert',
  },

  // Interest Rates
  SAVINGS_INTEREST_RATE: parseFloat(process.env.SAVINGS_INTEREST_RATE) || 0.15,
  MINIMUM_LOAN_INTEREST: parseFloat(process.env.MINIMUM_LOAN_INTEREST) || 3000,

  // Cycle Duration (months)
  CYCLE_DURATION: 6,
};
