const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Customer Register
router.post(
  '/register/customer',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required')
  ],
  validateRequest,
  AuthController.registerCustomer
);

// Worker Register
router.post(
  '/register/worker',
  upload.single('avatar'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required')
  ],
  validateRequest,
  AuthController.registerWorker
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  AuthController.login
);

// Forgot Password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validateRequest,
  AuthController.forgotPassword
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  validateRequest,
  AuthController.resetPassword
);

module.exports = router;
