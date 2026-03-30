const express = require('express');
const { body } = require('express-validator');
const reportController = require('../controllers/reportController');
const { validate } = require('../middleware/validation');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const sendMonthlyReportValidation = [
  body('recipientEmail').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('includeDetails').isBoolean().optional(),
];

// Routes
router.get('/monthly/:year/:month', authenticate, isAdmin, reportController.getMonthlyReport);
router.post('/monthly/:year/:month/send-email', authenticate, isAdmin, sendMonthlyReportValidation, validate, reportController.sendMonthlyReportEmail);

module.exports = router;