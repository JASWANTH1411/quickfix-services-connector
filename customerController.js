const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');

class CustomerController {
  // Get Customer Profile
  static async getProfile(req, res) {
    try {
      const customerId = req.user.id;
      const [customers] = await pool.query(
        `SELECT c.*, wal.balance AS wallet_balance 
         FROM customers c 
         LEFT JOIN wallet wal ON c.id = wal.user_id AND wal.user_type = 'customer' 
         WHERE c.id = ?`,
        [customerId]
      );

      if (customers.length === 0) {
        return ResponseHandler.error(res, 'Customer profile not found', null, 404);
      }

      const customer = customers[0];
      delete customer.password;

      return ResponseHandler.success(res, 'Customer profile fetched', customer);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching customer profile', err.message, 500);
    }
  }

  // Update Customer Profile
  static async updateProfile(req, res) {
    try {
      const customerId = req.user.id;
      const { name, phone, city, address, latitude, longitude } = req.body;

      const avatarPath = req.file ? `/uploads/profile/${req.file.filename}` : null;

      await pool.query(
        `UPDATE customers 
         SET name = COALESCE(?, name),
             phone = COALESCE(?, phone),
             city = COALESCE(?, city),
             address = COALESCE(?, address),
             latitude = COALESCE(?, latitude),
             longitude = COALESCE(?, longitude),
             avatar = COALESCE(?, avatar)
         WHERE id = ?`,
        [name, phone, city, address, latitude, longitude, avatarPath, customerId]
      );

      return ResponseHandler.success(res, 'Profile updated successfully!');
    } catch (err) {
      return ResponseHandler.error(res, 'Error updating profile', err.message, 500);
    }
  }

  // Get Customer Coupons
  static async getCoupons(req, res) {
    try {
      const [coupons] = await pool.query(
        `SELECT * FROM coupons WHERE is_active = 1 AND valid_until >= CURDATE() ORDER BY discount_percentage DESC`
      );
      return ResponseHandler.success(res, 'Coupons fetched', coupons);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching coupons', err.message, 500);
    }
  }
}

module.exports = CustomerController;
