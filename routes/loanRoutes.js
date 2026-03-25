const express = require('express');
const { body } = require('express-validator');
const loanController = require('../controllers/loanController');
const { validate } = require('../middleware/validation');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createLoanValidation = [
  body('cycleId').isUUID().withMessage('Valid cycle ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('purpose').optional().trim(),
];

const approveLoanValidation = [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('notes').optional().trim(),
];

const repayLoanValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('proofUrl').optional().trim(),
  body('notes').optional().trim(),
];

// Routes
router.post('/', authenticate, createLoanValidation, validate, loanController.createLoan);
router.get('/cycle/:cycleId', authenticate, loanController.getLoansByCycle);
router.get('/user/:userId', authenticate, loanController.getLoansByUser);
router.get('/:id', authenticate, loanController.getLoanById);
router.post('/:id/approve', authenticate, isAdmin, approveLoanValidation, validate, loanController.approveLoan);
router.post('/:id/disburse', authenticate, isAdmin, loanController.disburseLoan);
router.post('/:id/repay', authenticate, repayLoanValidation, validate, loanController.repayLoan);
router.post('/:id/verify-repayment/:repaymentId', authenticate, isAdmin, loanController.verifyRepayment);
router.delete('/:id', authenticate, isAdmin, loanController.deleteLoan);

module.exports = router;
