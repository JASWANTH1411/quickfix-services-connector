const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { generateOTP, generateBookingCode, calculateDistanceKm, logActivity } = require('../utils/helpers');
const NotificationService = require('../services/notificationService');

class BookingController {
  // Create New Booking
  static async createBooking(req, res) {
    try {
      const customerId = req.user.id;
      const {
        service_id,
        category_id,
        problem_description,
        booking_type,
        scheduled_date,
        scheduled_time,
        customer_address,
        customer_city,
        customer_pincode,
        latitude,
        longitude,
        coupon_code
      } = req.body;

      // Fetch service details
      const [services] = await pool.query(`SELECT * FROM services WHERE id = ?`, [service_id]);
      if (services.length === 0) {
        return ResponseHandler.error(res, 'Invalid service selected.', null, 400);
      }

      const service = services[0];
      let basePrice = parseFloat(service.price);
      let discountAmount = 0.00;
      let couponId = null;

      // Validate Coupon if provided
      if (coupon_code) {
        const [coupons] = await pool.query(
          `SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND valid_until >= CURDATE()`,
          [coupon_code]
        );
        if (coupons.length > 0) {
          const coupon = coupons[0];
          if (basePrice >= parseFloat(coupon.min_booking_amount)) {
            discountAmount = Math.min(
              (basePrice * parseFloat(coupon.discount_percentage)) / 100,
              parseFloat(coupon.max_discount_amount)
            );
            couponId = coupon.id;
          }
        }
      }

      const taxAmount = Math.round((basePrice - discountAmount) * 0.18 * 100) / 100; // 18% GST
      const totalAmount = Math.round((basePrice - discountAmount + taxAmount) * 100) / 100;
      const commissionAmount = Math.round(totalAmount * 0.15 * 100) / 100; // 15% Platform Commission
      const workerEarnings = Math.round((totalAmount - commissionAmount) * 100) / 100;

      const bookingCode = generateBookingCode();
      const otpCode = generateOTP();
      const userCity = customer_city || 'Mumbai';
      const userPincode = customer_pincode || '400001';
      const userLat = parseFloat(latitude) || 19.07600000;
      const userLng = parseFloat(longitude) || 72.87770000;

      const [result] = await pool.query(
        `INSERT INTO bookings (booking_code, customer_id, service_id, category_id, problem_description, booking_type, scheduled_date, scheduled_time, customer_address, customer_city, customer_pincode, customer_latitude, customer_longitude, otp, base_price, discount_amount, tax_amount, total_amount, commission_amount, worker_earnings, status, coupon_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)`,
        [
          bookingCode,
          customerId,
          service_id,
          category_id || service.category_id,
          problem_description || 'Standard Service Requested',
          booking_type || 'instant',
          scheduled_date || null,
          scheduled_time || null,
          customer_address,
          userCity,
          userPincode,
          userLat,
          userLng,
          otpCode,
          basePrice,
          discountAmount,
          taxAmount,
          totalAmount,
          commissionAmount,
          workerEarnings,
          couponId
        ]
      );

      const bookingId = result.insertId;

      // Handle Problem Images if uploaded
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const imgUrl = `/uploads/work_photos/${file.filename}`;
          await pool.query(
            `INSERT INTO booking_images (booking_id, image_url, image_type) VALUES (?, ?, 'customer_problem')`,
            [bookingId, imgUrl]
          );
        }
      }

      // Record Booking Status Log
      await pool.query(
        `INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'pending_approval', 'Booking created by customer, awaiting admin approval', 'customer')`,
        [bookingId]
      );

      // Socket.IO real-time alert to Admin Room for Approval
      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('new_booking_pending_approval', {
          booking_id: bookingId,
          booking_code: bookingCode,
          service_name: service.name,
          total_amount: totalAmount,
          customer_address,
          customer_city: userCity,
          customer_pincode: userPincode,
          problem_description
        });
      }

      await logActivity(customerId, 'customer', 'CREATE_BOOKING', `Created booking ${bookingCode} awaiting admin approval`, req.ip);

      return ResponseHandler.success(res, `Booking request submitted! Awaiting Admin approval before worker dispatch.`, {
        booking_id: bookingId,
        booking_code: bookingCode,
        total_amount: totalAmount,
        otp: otpCode,
        pincode: userPincode,
        city: userCity,
        status: 'pending_approval'
      }, 201);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to create booking', err.message, 500);
    }
  }

  // Get Customer Bookings
  static async getCustomerBookings(req, res) {
    try {
      const customerId = req.user.id;
      const [bookings] = await pool.query(
        `SELECT b.*, s.name AS service_name, s.image AS service_image, c.name AS category_name,
                w.name AS worker_name, w.phone AS worker_phone, w.avatar AS worker_avatar, w.rating_avg AS worker_rating
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         JOIN categories c ON b.category_id = c.id
         LEFT JOIN workers w ON b.worker_id = w.id
         WHERE b.customer_id = ?
         ORDER BY b.id DESC`,
        [customerId]
      );

      return ResponseHandler.success(res, 'Bookings fetched successfully', bookings);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching customer bookings', err.message, 500);
    }
  }

  // Get Worker Bookings
  static async getWorkerBookings(req, res) {
    try {
      const workerId = req.user.id;
      const [bookings] = await pool.query(
        `SELECT b.*, s.name AS service_name, c.name AS category_name,
                cust.name AS customer_name, cust.phone AS customer_phone, cust.avatar AS customer_avatar
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         JOIN categories c ON b.category_id = c.id
         JOIN customers cust ON b.customer_id = cust.id
         WHERE b.worker_id = ?
         ORDER BY b.id DESC`,
        [workerId]
      );

      return ResponseHandler.success(res, 'Worker jobs fetched successfully', bookings);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching worker jobs', err.message, 500);
    }
  }

  // Get Approved Unassigned Booking Requests for Online Workers
  static async getAvailableRequestsForWorker(req, res) {
    try {
      const workerId = req.user.id;
      const [workers] = await pool.query(`SELECT category_id, city, pincode FROM workers WHERE id = ?`, [workerId]);
      const worker = workers[0] || {};

      const [requests] = await pool.query(
        `SELECT b.*, s.name AS service_name, c.name AS category_name
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         JOIN categories c ON b.category_id = c.id
         WHERE b.status = 'approved' AND b.worker_id IS NULL
         ORDER BY b.id DESC`
      );

      return ResponseHandler.success(res, 'Available booking requests fetched', requests);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching available requests', err.message, 500);
    }
  }

  // Get Single Booking Details
  static async getBookingDetails(req, res) {
    try {
      const { id } = req.params;
      const [bookings] = await pool.query(
        `SELECT b.*, s.name AS service_name, s.description AS service_desc, c.name AS category_name,
                cust.name AS customer_name, cust.phone AS customer_phone, cust.avatar AS customer_avatar,
                w.name AS worker_name, w.phone AS worker_phone, w.avatar AS worker_avatar, w.rating_avg AS worker_rating,
                wl.latitude AS worker_latitude, wl.longitude AS worker_longitude
         FROM bookings b
         JOIN services s ON b.service_id = s.id
         JOIN categories c ON b.category_id = c.id
         JOIN customers cust ON b.customer_id = cust.id
         LEFT JOIN workers w ON b.worker_id = w.id
         LEFT JOIN worker_locations wl ON w.id = wl.worker_id
         WHERE b.id = ? OR b.booking_code = ?`,
        [id, id]
      );

      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      const booking = bookings[0];

      // Fetch images
      const [images] = await pool.query(`SELECT * FROM booking_images WHERE booking_id = ?`, [booking.id]);
      booking.images = images;

      // Fetch status timeline
      const [statusTimeline] = await pool.query(`SELECT * FROM booking_status WHERE booking_id = ? ORDER BY id ASC`, [booking.id]);
      booking.timeline = statusTimeline;

      return ResponseHandler.success(res, 'Booking details fetched successfully', booking);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching booking details', err.message, 500);
    }
  }

  // Worker Accepts Booking
  static async acceptBooking(req, res) {
    try {
      const workerId = req.user.id;
      const { booking_id } = req.body;

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ? AND status IN ('approved', 'pending_approval', 'pending')`, [booking_id]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking is no longer available or already accepted by another worker.', null, 400);
      }

      await pool.query(
        `UPDATE bookings SET worker_id = ?, status = 'accepted' WHERE id = ?`,
        [workerId, booking_id]
      );

      await pool.query(
        `INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'accepted', 'Worker accepted job request', 'worker')`,
        [booking_id]
      );

      const io = req.app.get('io');
      const booking = bookings[0];

      // Notify Customer
      await NotificationService.sendNotification(
        booking.customer_id,
        'customer',
        'Worker Assigned!',
        `A worker has accepted your booking #${booking.booking_code}. You can now track their live location.`,
        'success',
        `/customer/dashboard.html?track=${booking_id}`,
        io
      );

      if (io) {
        io.to(`customer_${booking.customer_id}`).emit('booking_status_updated', {
          booking_id,
          status: 'accepted',
          worker_id: workerId
        });
      }

      return ResponseHandler.success(res, 'Booking accepted successfully!');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to accept booking', err.message, 500);
    }
  }

  // Worker Reaches Destination
  static async markReached(req, res) {
    try {
      const workerId = req.user.id;
      const { booking_id } = req.body;

      await pool.query(
        `UPDATE bookings SET status = 'reached' WHERE id = ? AND worker_id = ?`,
        [booking_id, workerId]
      );

      await pool.query(
        `INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'reached', 'Worker arrived at customer address', 'worker')`,
        [booking_id]
      );

      const [bookings] = await pool.query(`SELECT customer_id, booking_code FROM bookings WHERE id = ?`, [booking_id]);
      const io = req.app.get('io');

      if (bookings.length > 0) {
        await NotificationService.sendNotification(
          bookings[0].customer_id,
          'customer',
          'Worker Arrived!',
          `Worker has arrived at your location for booking #${bookings[0].booking_code}. Share your OTP to start work.`,
          'info',
          '#',
          io
        );
      }

      return ResponseHandler.success(res, 'Marked as arrived at customer destination.');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to update status', err.message, 500);
    }
  }

  // Start Work with OTP Verification
  static async startWork(req, res) {
    try {
      const workerId = req.user.id;
      const { booking_id, otp } = req.body;

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ? AND worker_id = ?`, [booking_id, workerId]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      const booking = bookings[0];
      if (booking.otp !== otp) {
        return ResponseHandler.error(res, 'Invalid OTP provided by customer.', null, 400);
      }

      await pool.query(
        `UPDATE bookings SET status = 'in_progress', started_at = NOW() WHERE id = ?`,
        [booking_id]
      );

      await pool.query(
        `INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'in_progress', 'OTP verified & Work started', 'worker')`,
        [booking_id]
      );

      const io = req.app.get('io');
      if (io) {
        io.to(`customer_${booking.customer_id}`).emit('booking_status_updated', {
          booking_id,
          status: 'in_progress'
        });
      }

      return ResponseHandler.success(res, 'OTP verified! Work started successfully.');
    } catch (err) {
      return ResponseHandler.error(res, 'Error starting work', err.message, 500);
    }
  }

  // Complete Work
  static async completeWork(req, res) {
    try {
      const workerId = req.user.id;
      const { booking_id } = req.body;

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ? AND worker_id = ?`, [booking_id, workerId]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      const booking = bookings[0];

      await pool.query(
        `UPDATE bookings SET status = 'completed', completed_at = NOW() WHERE id = ?`,
        [booking_id]
      );

      // Increment worker's completed jobs counter
      await pool.query(`UPDATE workers SET total_jobs_completed = total_jobs_completed + 1 WHERE id = ?`, [workerId]);

      // Upload completion photo if present
      if (req.file) {
        const imgUrl = `/uploads/work_photos/${req.file.filename}`;
        await pool.query(
          `INSERT INTO booking_images (booking_id, image_url, image_type) VALUES (?, ?, 'worker_completion')`,
          [booking_id, imgUrl]
        );
      }

      await pool.query(
        `INSERT INTO booking_status (booking_id, status, notes, updated_by_role) VALUES (?, 'completed', 'Work completed by technician', 'worker')`,
        [booking_id]
      );

      const io = req.app.get('io');
      await NotificationService.sendNotification(
        booking.customer_id,
        'customer',
        'Work Completed!',
        `Your service for booking #${booking.booking_code} is completed. Please complete payment & rate your technician.`,
        'success',
        `/payment.html?booking_id=${booking_id}`,
        io
      );

      if (io) {
        io.to(`customer_${booking.customer_id}`).emit('booking_status_updated', {
          booking_id,
          status: 'completed'
        });
      }

      return ResponseHandler.success(res, 'Work completed successfully! Customer notified for payment.');
    } catch (err) {
      return ResponseHandler.error(res, 'Error completing work', err.message, 500);
    }
  }
}

module.exports = BookingController;
