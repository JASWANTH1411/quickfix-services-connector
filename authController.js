const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ResponseHandler = require('../utils/responseHandler');
const { generateOTP, logActivity } = require('../utils/helpers');

class AuthController {
  // Register Customer
  static async registerCustomer(req, res) {
    try {
      const { name, email, password, phone, city, address } = req.body;

      const [existing] = await pool.query(
        `SELECT id FROM customers WHERE email = ? OR phone = ?`,
        [email, phone]
      );
      if (existing.length > 0) {
        return ResponseHandler.error(res, 'Email or Phone number is already registered.', null, 400);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        `INSERT INTO customers (name, email, password, phone, city, address, is_verified) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [name, email, hashedPassword, phone, city || 'Mumbai', address || '']
      );

      const customerId = result.insertId;

      // Create Customer Wallet
      await pool.query(`INSERT INTO wallet (user_id, user_type, balance) VALUES (?, 'customer', 0.00)`, [customerId]);

      const token = jwt.sign(
        { id: customerId, email, role: 'customer', name },
        process.env.JWT_SECRET || 'quickfix_super_secret_jwt_key_2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await logActivity(customerId, 'customer', 'REGISTER', `Customer registered: ${email}`, req.ip);

      return ResponseHandler.success(res, 'Customer account created successfully!', {
        token,
        user: { id: customerId, name, email, phone, role: 'customer' }
      }, 201);
    } catch (err) {
      return ResponseHandler.error(res, 'Registration failed', err.message, 500);
    }
  }

  // Register Worker
  static async registerWorker(req, res) {
    try {
      const { name, email, password, phone, category_id, experience_years, hourly_rate, bio, city, address } = req.body;

      const [existing] = await pool.query(
        `SELECT id FROM workers WHERE email = ? OR phone = ?`,
        [email, phone]
      );
      if (existing.length > 0) {
        return ResponseHandler.error(res, 'Email or Phone number is already registered.', null, 400);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatarPath = req.file ? `/uploads/profile/${req.file.filename}` : '/uploads/profile/default-worker.png';

      const [result] = await pool.query(
        `INSERT INTO workers (name, email, password, phone, category_id, experience_years, hourly_rate, bio, city, address, avatar, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [name, email, hashedPassword, phone, category_id || 1, experience_years || 1, hourly_rate || 350, bio || '', city || 'Mumbai', address || '', avatarPath]
      );

      const workerId = result.insertId;

      // Create Worker Wallet & Location record
      await pool.query(`INSERT INTO wallet (user_id, user_type, balance) VALUES (?, 'worker', 0.00)`, [workerId]);
      await pool.query(`INSERT INTO worker_locations (worker_id, latitude, longitude) VALUES (?, 19.07600000, 72.87770000)`, [workerId]);
      await pool.query(`INSERT INTO worker_documents (worker_id) VALUES (?)`, [workerId]);

      const token = jwt.sign(
        { id: workerId, email, role: 'worker', name },
        process.env.JWT_SECRET || 'quickfix_super_secret_jwt_key_2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await logActivity(workerId, 'worker', 'REGISTER', `Worker registered: ${email}`, req.ip);

      return ResponseHandler.success(res, 'Worker registered successfully! Please upload verification documents to start accepting bookings.', {
        token,
        user: { id: workerId, name, email, phone, role: 'worker', verification_status: 'pending' }
      }, 201);
    } catch (err) {
      return ResponseHandler.error(res, 'Worker registration failed', err.message, 500);
    }
  }

  // Unified Login (Customer, Worker, Admin)
  static async login(req, res) {
    try {
      const { email, password, role } = req.body;

      let user = null;
      let tableName = '';

      if (role === 'admin') {
        tableName = 'admins';
      } else if (role === 'worker') {
        tableName = 'workers';
      } else {
        tableName = 'customers';
      }

      const [users] = await pool.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);

      if (users.length === 0) {
        return ResponseHandler.error(res, 'Invalid credentials. User not found.', null, 401);
      }

      user = users[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return ResponseHandler.error(res, 'Invalid credentials. Password incorrect.', null, 401);
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: role || (user.role ? 'admin' : 'customer'),
          name: user.name
        },
        process.env.JWT_SECRET || 'quickfix_super_secret_jwt_key_2026',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await logActivity(user.id, role || 'customer', 'LOGIN', `Logged in as ${role || 'customer'}`, req.ip);

      delete user.password;

      return ResponseHandler.success(res, 'Login successful!', {
        token,
        user: { ...user, role: role || 'customer' }
      });
    } catch (err) {
      return ResponseHandler.error(res, 'Login failed', err.message, 500);
    }
  }

  // Forgot Password / Request OTP
  static async forgotPassword(req, res) {
    try {
      const { email, role } = req.body;
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await pool.query(
        `INSERT INTO otp (phone_or_email, code, purpose, expires_at) VALUES (?, ?, 'password_reset', ?)`,
        [email, otpCode, expiresAt]
      );

      return ResponseHandler.success(res, `Password reset OTP generated. Demo OTP: ${otpCode}`, { demo_otp: otpCode });
    } catch (err) {
      return ResponseHandler.error(res, 'Error requesting password reset', err.message, 500);
    }
  }

  // Reset Password
  static async resetPassword(req, res) {
    try {
      const { email, otp, new_password, role } = req.body;

      const [otps] = await pool.query(
        `SELECT * FROM otp WHERE phone_or_email = ? AND code = ? AND purpose = 'password_reset' AND is_used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1`,
        [email, otp]
      );

      if (otps.length === 0) {
        return ResponseHandler.error(res, 'Invalid or expired OTP.', null, 400);
      }

      await pool.query(`UPDATE otp SET is_used = 1 WHERE id = ?`, [otps[0].id]);

      const hashedPassword = await bcrypt.hash(new_password, 10);
      const tableName = role === 'worker' ? 'workers' : (role === 'admin' ? 'admins' : 'customers');

      await pool.query(`UPDATE ${tableName} SET password = ? WHERE email = ?`, [hashedPassword, email]);

      return ResponseHandler.success(res, 'Password updated successfully. Please login with your new password.');
    } catch (err) {
      return ResponseHandler.error(res, 'Password reset failed', err.message, 500);
    }
  }
}

module.exports = AuthController;
