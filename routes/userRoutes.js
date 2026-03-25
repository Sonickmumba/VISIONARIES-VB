const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { validate } = require('../middleware/validation');
const { authenticate, isSuperAdmin, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const updateUserValidation = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const updateRoleValidation = [
  body('role').isIn(['super_admin', 'admin', 'member']).withMessage('Invalid role'),
];

// Routes
router.get('/', authenticate, isAdmin, userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, updateUserValidation, validate, userController.updateUser);
router.put('/:id/role', authenticate, isSuperAdmin, updateRoleValidation, validate, userController.updateUserRole);
router.put('/:id/toggle-status', authenticate, isSuperAdmin, userController.toggleUserStatus);
router.delete('/:id', authenticate, isSuperAdmin, userController.deleteUser);

module.exports = router;
