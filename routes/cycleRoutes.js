const express = require('express');
const { body } = require('express-validator');
const cycleController = require('../controllers/cycleController');
const { validate } = require('../middleware/validation');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createCycleValidation = [
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('name').trim().notEmpty().withMessage('Cycle name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
];

// Routes
router.post('/', authenticate, isAdmin, createCycleValidation, validate, cycleController.createCycle);
router.get('/group/:groupId', authenticate, cycleController.getCyclesByGroup);
router.get('/:id/statistics', authenticate, cycleController.getCycleStatistics);
router.get('/:id', authenticate, cycleController.getCycleById);
router.put('/:id', authenticate, isAdmin, cycleController.updateCycle);
router.post('/:id/close', authenticate, isAdmin, cycleController.closeCycle);
router.post('/:id/calculate-shareout', authenticate, isAdmin, cycleController.calculateShareout);
router.delete('/:id', authenticate, isAdmin, cycleController.deleteCycle);

module.exports = router;
