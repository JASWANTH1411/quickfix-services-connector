const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');

class AdminController {
  // High-level Dashboard Statistics & Chart Metrics
  static async getDashboardAnalytics(req, res) {
    try {
      const [customersCount] = await pool.query(`SELECT COUNT(id) AS count FROM customers`);
      const [workersCount] = await pool.query(`SELECT COUNT(id) AS count FROM workers`);
      const [bookingsCount] = await pool.query(`SELECT COUNT(id) AS count FROM bookings`);
      const [completedJobs] = await pool.query(`SELECT COUNT(id) AS count FROM bookings WHERE status = 'completed'`);
      const [cancelledJobs] = await pool.query(`SELECT COUNT(id) AS count FROM bookings WHERE status = 'cancelled'`);

      const [revenueData] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COALESCE(SUM(commission_amount), 0) AS total_commission 
         FROM bookings WHERE status = 'completed'`
      );

      const [pendingApprovals] = await pool.query(
        `SELECT COUNT(id) AS count FROM workers WHERE verification_status = 'pending'`
      );

      // Monthly Revenue Chart Data (Last 6 Months)
      const [monthlyRevenue] = await pool.query(
        `SELECT DATE_FORMAT(completed_at, '%b %Y') AS month_year, 
                COALESCE(SUM(total_amount), 0) AS revenue, 
                COALESCE(SUM(commission_amount), 0) AS commission
         FROM bookings 
         WHERE status = 'completed' AND completed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(completed_at, '%b %Y'), YEAR(completed_at), MONTH(completed_at)
         ORDER BY YEAR(completed_at) ASC, MONTH(completed_at) ASC`
      );

      // Category Booking Distribution (Pie Chart Data)
      const [categoryDistribution] = await pool.query(
        `SELECT c.name AS category_name, COUNT(b.id) AS booking_count
         FROM bookings b
         JOIN categories c ON b.category_id = c.id
         GROUP BY c.id, c.name
         ORDER BY booking_count DESC LIMIT 6`
      );

      // Top Performing Workers (Bar Chart Data)
      const [topWorkers] = await pool.query(
        `SELECT w.name, w.rating_avg, w.total_jobs_completed, COALESCE(SUM(b.worker_earnings), 0) AS total_earnings
         FROM workers w
         LEFT JOIN bookings b ON w.id = b.worker_id AND b.status = 'completed'
         GROUP BY w.id
         ORDER BY w.total_jobs_completed DESC LIMIT 5`
      );

      return ResponseHandler.success(res, 'Admin analytics fetched successfully', {
        summary: {
          total_customers: customersCount[0].count,
          total_workers: workersCount[0].count,
          total_bookings: bookingsCount[0].count,
          completed_jobs: completedJobs[0].count,
          cancelled_jobs: cancelledJobs[0].count,
          total_revenue: parseFloat(revenueData[0].total_revenue),
          total_commission: parseFloat(revenueData[0].total_commission),
          pending_worker_approvals: pendingApprovals[0].count
        },
        charts: {
          monthly_revenue: monthlyRevenue,
          category_distribution: categoryDistribution,
          top_workers: topWorkers
        }
      });
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching admin analytics', err.message, 500);
    }
  }

  // Get Workers Pending Verification
  static async getPendingWorkers(req, res) {
    try {
      const [workers] = await pool.query(
        `SELECT w.*, c.name AS category_name, wd.aadhaar_number, wd.aadhaar_file, wd.pan_number, wd.pan_file,
                wd.driving_license_number, wd.driving_license_file, wd.certificates_file, wd.submitted_at
         FROM workers w
         JOIN categories c ON w.category_id = c.id
         JOIN worker_documents wd ON w.id = wd.worker_id
         WHERE w.verification_status = 'pending'
         ORDER BY wd.submitted_at DESC`
      );

      return ResponseHandler.success(res, 'Pending worker document approvals fetched', workers);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching pending worker approvals', err.message, 500);
    }
  }

  // Approve or Reject Worker Verification
  static async verifyWorker(req, res) {
    try {
      const { worker_id, status, rejection_reason } = req.body; // status: 'verified' or 'rejected'

      if (!['verified', 'rejected'].includes(status)) {
        return ResponseHandler.error(res, 'Invalid status action', null, 400);
      }

      const isVerified = status === 'verified' ? 1 : 0;
      await pool.query(
        `UPDATE workers SET is_verified = ?, verification_status = ?, rejection_reason = ? WHERE id = ?`,
        [isVerified, status, rejection_reason || null, worker_id]
      );

      if (status === 'verified') {
        await pool.query(`UPDATE worker_documents SET verified_at = NOW() WHERE worker_id = ?`, [worker_id]);
      }

      return ResponseHandler.success(res, `Worker status updated to ${status.toUpperCase()}`);
    } catch (err) {
      return ResponseHandler.error(res, 'Error verifying worker', err.message, 500);
    }
  }

  // Manage Customers
  static async getCustomers(req, res) {
    try {
      const [customers] = await pool.query(
        `SELECT c.*, COUNT(b.id) AS total_bookings 
         FROM customers c 
         LEFT JOIN bookings b ON c.id = b.customer_id 
         GROUP BY c.id 
         ORDER BY c.id DESC`
      );
      return ResponseHandler.success(res, 'Customers fetched', customers);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching customers', err.message, 500);
    }
  }

  // Manage Workers List
  static async getWorkers(req, res) {
    try {
      const [workers] = await pool.query(
        `SELECT w.*, c.name AS category_name 
         FROM workers w 
         JOIN categories c ON w.category_id = c.id 
         ORDER BY w.id DESC`
      );
      return ResponseHandler.success(res, 'Workers fetched', workers);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching workers', err.message, 500);
    }
  }

  // Manage Withdraw Requests
  static async getWithdrawRequests(req, res) {
    try {
      const [requests] = await pool.query(
        `SELECT wr.*, w.name AS worker_name, w.phone AS worker_phone 
         FROM withdraw_requests wr 
         JOIN workers w ON wr.worker_id = w.id 
         ORDER BY wr.requested_at DESC`
      );
      return ResponseHandler.success(res, 'Withdrawal requests fetched', requests);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching withdraw requests', err.message, 500);
    }
  }

  // Process Withdraw Request (Approve/Reject)
  static async processWithdrawRequest(req, res) {
    try {
      const { request_id, status, admin_notes } = req.body;

      await pool.query(
        `UPDATE withdraw_requests SET status = ?, admin_notes = ?, processed_at = NOW() WHERE id = ?`,
        [status, admin_notes || '', request_id]
      );

      // If rejected, refund back to worker wallet
      if (status === 'rejected') {
        const [reqs] = await pool.query(`SELECT worker_id, amount FROM withdraw_requests WHERE id = ?`, [request_id]);
        if (reqs.length > 0) {
          await pool.query(`UPDATE wallet SET balance = balance + ? WHERE user_id = ? AND user_type = 'worker'`, [reqs[0].amount, reqs[0].worker_id]);
        }
      }

      return ResponseHandler.success(res, `Withdrawal request ${status.toUpperCase()}`);
    } catch (err) {
      return ResponseHandler.error(res, 'Error processing withdraw request', err.message, 500);
    }
  }

  // Get System Activity Logs
  static async getActivityLogs(req, res) {
    try {
      const [logs] = await pool.query(`SELECT * FROM activity_logs ORDER BY id DESC LIMIT 100`);
      return ResponseHandler.success(res, 'Activity logs fetched', logs);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching activity logs', err.message, 500);
    }
  }

  // Get Bookings Pending Admin Approval
  static async getPendingBookings(req, res) {
    try {
      const [bookings] = await pool.query(
        `SELECT b.*, s.name AS service_name, c.name AS category_name, cust.name AS customer_name, cust.phone AS customer_phone
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         JOIN categories c ON b.category_id = c.id
         JOIN customers cust ON b.customer_id = cust.id
         WHERE b.status = 'pending_approval'
         ORDER BY b.id DESC`
      );

      return ResponseHandler.success(res, 'Pending booking approvals fetched', bookings);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching pending bookings', err.message, 500);
    }
  }

  // Admin Approves Booking & Broadcasts to Workers
  static async approveBooking(req, res) {
    try {
      const { booking_id } = req.body;

      const [bookings] = await pool.query(`SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON b.service_id = s.id WHERE b.id = ? AND b.status = 'pending_approval'`, [booking_id]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking request not found or already processed.', null, 400);
      }

      const booking = bookings[0];

      await pool.query(`UPDATE bookings SET status = 'approved' WHERE id = ?`, [booking_id]);
      await pool.query(`INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'approved', 'Approved by Admin, broadcasted to online workers', 'admin')`, [booking_id]);

      // Query online workers in this category or city using LEFT JOIN (so missing worker_location row doesn't drop worker)
      const userPincode = booking.customer_pincode || '400001';
      const userCity = booking.customer_city || 'Mumbai';

      const [nearbyWorkers] = await pool.query(
        `SELECT w.id, w.name, w.phone, w.city, w.pincode, w.rating_avg
         FROM workers w 
         WHERE w.category_id = ? AND w.is_online = 1`,
        [booking.category_id]
      );

      // Fallback: If no worker in exact category is online, find ANY online worker
      let targetWorkers = nearbyWorkers;
      if (targetWorkers.length === 0) {
        const [anyOnlineWorkers] = await pool.query(`SELECT w.id, w.name FROM workers w WHERE w.is_online = 1`);
        targetWorkers = anyOnlineWorkers;
      }

      const io = req.app.get('io');
      const bookingRequestPayload = {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        service_name: booking.service_name,
        total_amount: booking.total_amount,
        worker_earnings: booking.worker_earnings,
        area_pincode: `Area Pincode: ${userPincode} (${userCity})`,
        city: userCity,
        pincode: userPincode,
        problem_description: booking.problem_description
      };

      if (io) {
        // Broadcast to specific online worker rooms
        targetWorkers.forEach(worker => {
          io.to(`worker_${worker.id}`).emit('new_booking_request', bookingRequestPayload);
        });

        // Also broadcast globally to all online workers room
        io.emit('new_booking_request', bookingRequestPayload);
      }

      const NotificationService = require('../services/notificationService');
      await NotificationService.sendNotification(
        booking.customer_id,
        'customer',
        'Booking Approved by Admin!',
        `Your booking #${booking.booking_code} has been approved by admin and broadcasted to ${nearbyWorkers.length} nearby technicians.`,
        'success',
        `/customer/dashboard.html?track=${booking.id}`,
        io
      );

      return ResponseHandler.success(res, `Booking #${booking.booking_code} approved! Broadcasted to ${nearbyWorkers.length} workers in pincode ${userPincode}.`);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to approve booking', err.message, 500);
    }
  }

  // Admin Rejects Booking
  static async rejectBooking(req, res) {
    try {
      const { booking_id, rejection_reason } = req.body;

      const [bookings] = await pool.query(`SELECT customer_id, booking_code FROM bookings WHERE id = ?`, [booking_id]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      await pool.query(`UPDATE bookings SET status = 'cancelled', cancellation_reason = ? WHERE id = ?`, [rejection_reason || 'Rejected by Admin', booking_id]);
      await pool.query(`INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'cancelled', ?, 'admin')`, [booking_id, rejection_reason || 'Rejected by Admin']);

      const io = req.app.get('io');
      const NotificationService = require('../services/notificationService');
      await NotificationService.sendNotification(
        bookings[0].customer_id,
        'customer',
        'Booking Rejected by Admin',
        `Your booking #${bookings[0].booking_code} was not approved: ${rejection_reason || 'Service unavailable'}.`,
        'warning',
        '#',
        io
      );

      return ResponseHandler.success(res, 'Booking request rejected');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to reject booking', err.message, 500);
    }
  }
}

module.exports = AdminController;
