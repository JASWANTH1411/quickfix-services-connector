const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');

class WorkerController {
  // Get Worker Profile & Status
  static async getProfile(req, res) {
    try {
      const workerId = req.user.id;
      const [workers] = await pool.query(
        `SELECT w.*, c.name AS category_name, wd.aadhaar_number, wd.pan_number, wd.driving_license_number,
                wal.balance AS wallet_balance
         FROM workers w
         LEFT JOIN categories c ON w.category_id = c.id
         LEFT JOIN worker_documents wd ON w.id = wd.worker_id
         LEFT JOIN wallet wal ON w.id = wal.user_id AND wal.user_type = 'worker'
         WHERE w.id = ?`,
        [workerId]
      );

      if (workers.length === 0) {
        return ResponseHandler.error(res, 'Worker profile not found', null, 404);
      }

      const worker = workers[0];
      delete worker.password;

      return ResponseHandler.success(res, 'Worker profile fetched', worker);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching worker profile', err.message, 500);
    }
  }

  // Toggle Online/Offline Status
  static async toggleOnlineStatus(req, res) {
    try {
      const workerId = req.user.id;
      const { is_online } = req.body;

      const onlineFlag = is_online ? 1 : 0;
      await pool.query(`UPDATE workers SET is_online = ? WHERE id = ?`, [onlineFlag, workerId]);

      return ResponseHandler.success(res, `Status updated to ${onlineFlag ? 'ONLINE' : 'OFFLINE'}`, { is_online: onlineFlag });
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to update online status', err.message, 500);
    }
  }

  // Upload Worker Verification Documents
  static async uploadDocuments(req, res) {
    try {
      const workerId = req.user.id;
      const { aadhaar_number, pan_number, driving_license_number } = req.body;

      let aadhaarFile = req.files && req.files['aadhaar'] ? `/uploads/documents/${req.files['aadhaar'][0].filename}` : null;
      let panFile = req.files && req.files['pan'] ? `/uploads/documents/${req.files['pan'][0].filename}` : null;
      let dlFile = req.files && req.files['driving_license'] ? `/uploads/documents/${req.files['driving_license'][0].filename}` : null;
      let certsFile = req.files && req.files['certificates'] ? `/uploads/documents/${req.files['certificates'][0].filename}` : null;

      // Update or insert into worker_documents
      const [existing] = await pool.query(`SELECT id FROM worker_documents WHERE worker_id = ?`, [workerId]);

      if (existing.length > 0) {
        await pool.query(
          `UPDATE worker_documents 
           SET aadhaar_number = COALESCE(?, aadhaar_number),
               aadhaar_file = COALESCE(?, aadhaar_file),
               pan_number = COALESCE(?, pan_number),
               pan_file = COALESCE(?, pan_file),
               driving_license_number = COALESCE(?, driving_license_number),
               driving_license_file = COALESCE(?, driving_license_file),
               certificates_file = COALESCE(?, certificates_file),
               submitted_at = NOW()
           WHERE worker_id = ?`,
          [aadhaar_number, aadhaarFile, pan_number, panFile, driving_license_number, dlFile, certsFile, workerId]
        );
      } else {
        await pool.query(
          `INSERT INTO worker_documents (worker_id, aadhaar_number, aadhaar_file, pan_number, pan_file, driving_license_number, driving_license_file, certificates_file)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [workerId, aadhaar_number, aadhaarFile, pan_number, panFile, driving_license_number, dlFile, certsFile]
        );
      }

      await pool.query(`UPDATE workers SET verification_status = 'pending' WHERE id = ?`, [workerId]);

      return ResponseHandler.success(res, 'Verification documents submitted successfully! Admin review in progress.');
    } catch (err) {
      return ResponseHandler.error(res, 'Error submitting documents', err.message, 500);
    }
  }

  // Get Earnings Statistics (Daily, Weekly, Monthly)
  static async getEarnings(req, res) {
    try {
      const workerId = req.user.id;

      // Daily earnings
      const [daily] = await pool.query(
        `SELECT COALESCE(SUM(worker_earnings), 0) AS amount, COUNT(id) AS jobs 
         FROM bookings 
         WHERE worker_id = ? AND status = 'completed' AND DATE(completed_at) = CURDATE()`,
        [workerId]
      );

      // Weekly earnings
      const [weekly] = await pool.query(
        `SELECT COALESCE(SUM(worker_earnings), 0) AS amount, COUNT(id) AS jobs 
         FROM bookings 
         WHERE worker_id = ? AND status = 'completed' AND YEARWEEK(completed_at, 1) = YEARWEEK(CURDATE(), 1)`,
        [workerId]
      );

      // Monthly earnings
      const [monthly] = await pool.query(
        `SELECT COALESCE(SUM(worker_earnings), 0) AS amount, COUNT(id) AS jobs 
         FROM bookings 
         WHERE worker_id = ? AND status = 'completed' AND MONTH(completed_at) = MONTH(CURDATE()) AND YEAR(completed_at) = YEAR(CURDATE())`,
        [workerId]
      );

      // Overall total
      const [total] = await pool.query(
        `SELECT COALESCE(SUM(worker_earnings), 0) AS amount, COUNT(id) AS jobs 
         FROM bookings 
         WHERE worker_id = ? AND status = 'completed'`,
        [workerId]
      );

      return ResponseHandler.success(res, 'Earnings metrics calculated', {
        daily: daily[0],
        weekly: weekly[0],
        monthly: monthly[0],
        total: total[0]
      });
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching earnings', err.message, 500);
    }
  }

  // Request Wallet Withdrawal
  static async requestWithdrawal(req, res) {
    try {
      const workerId = req.user.id;
      const { amount, bank_account, ifsc } = req.body;

      const [wallets] = await pool.query(`SELECT balance FROM wallet WHERE user_id = ? AND user_type = 'worker'`, [workerId]);
      const currentBalance = wallets.length > 0 ? parseFloat(wallets[0].balance) : 0;

      if (currentBalance < parseFloat(amount)) {
        return ResponseHandler.error(res, 'Insufficient wallet balance for withdrawal.', null, 400);
      }

      // Deduct from wallet & record pending request
      await pool.query(`UPDATE wallet SET balance = balance - ? WHERE user_id = ? AND user_type = 'worker'`, [amount, workerId]);

      await pool.query(
        `INSERT INTO withdraw_requests (worker_id, amount, bank_account, ifsc, status) VALUES (?, ?, ?, ?, 'pending')`,
        [workerId, amount, bank_account, ifsc]
      );

      // Save Bank Details for future reference
      await pool.query(
        `UPDATE workers SET bank_account_number = ?, bank_ifsc = ? WHERE id = ?`,
        [bank_account, ifsc, workerId]
      );

      return ResponseHandler.success(res, 'Withdrawal request submitted! Admin will process transfer soon.');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to process withdrawal request', err.message, 500);
    }
  }
}

module.exports = WorkerController;
