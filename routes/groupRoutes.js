const express = require('express');
const { body } = require('express-validator');
const groupController = require('../controllers/groupController');
const { validate } = require('../middleware/validation');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createGroupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('description').optional().trim(),
  body('leaderId').optional().isUUID().withMessage('Valid leader ID required'),
];

// Routes
router.post('/', authenticate, isAdmin, createGroupValidation, validate, groupController.createGroup);
router.get('/', authenticate, groupController.getAllGroups);
router.get('/:id', authenticate, groupController.getGroupById);
router.put('/:id', authenticate, isAdmin, groupController.updateGroup);
router.post('/:id/members', authenticate, isAdmin, groupController.addMember);
router.delete('/:id/members/:userId', authenticate, isAdmin, groupController.removeMember);
router.delete('/:id', authenticate, isAdmin, groupController.deleteGroup);

module.exports = router;
