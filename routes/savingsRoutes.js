const express = require('express');
const { body } = require('express-validator');
const savingsController = require('../controllers/savingsController');
const { validate } = require('../middleware/validation');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createSavingsValidation = [
  body('cycleId').isUUID().withMessage('Valid cycle ID is required'),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year is required'),
];

const verifySavingsValidation = [
  body('status').isIn(['verified', 'rejected']).withMessage('Status must be verified or rejected'),
  body('notes').optional().trim(),
];

// Routes
router.post('/', authenticate, createSavingsValidation, validate, savingsController.createSavings);
router.get('/cycle/:cycleId', authenticate, savingsController.getSavingsByCycle);
router.get('/user/:userId', authenticate, savingsController.getSavingsByUser);
router.get('/:id', authenticate, savingsController.getSavingsById);
router.put('/:id', authenticate, savingsController.updateSavings);
router.post('/:id/verify', authenticate, isAdmin, verifySavingsValidation, validate, savingsController.verifySavings);
router.delete('/:id', authenticate, isAdmin, savingsController.deleteSavings);

module.exports = router;
