const pool = require('../config/db');
const { razorpayInstance } = require('../config/razorpay');
const crypto = require('crypto');
const ResponseHandler = require('../utils/responseHandler');
const PDFService = require('../services/pdfService');
const NotificationService = require('../services/notificationService');

class PaymentController {
  // Create Razorpay Order
  static async createRazorpayOrder(req, res) {
    try {
      const { booking_id } = req.body;
      const customerId = req.user.id;

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ? AND customer_id = ?`, [booking_id, customerId]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      const booking = bookings[0];
      const amountInPaise = Math.round(parseFloat(booking.total_amount) * 100);

      let order = null;
      if (razorpayInstance) {
        order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${booking.booking_code}`,
          notes: {
            booking_id: booking.id,
            customer_id: customerId
          }
        });
      } else {
        // Fallback demo order ID
        order = {
          id: `order_demo_${Date.now()}`,
          amount: amountInPaise,
          currency: 'INR'
        };
      }

      // Record pending payment
      await pool.query(
        `INSERT INTO payments (booking_id, customer_id, payment_method, razorpay_order_id, amount, status) 
         VALUES (?, ?, 'razorpay', ?, ?, 'pending')`,
        [booking_id, customerId, order.id, booking.total_amount]
      );

      return ResponseHandler.success(res, 'Razorpay order created', {
        order_id: order.id,
        amount: booking.total_amount,
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_quickfix12345'
      });
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to create Razorpay order', err.message, 500);
    }
  }

  // Verify Razorpay Payment Signature
  static async verifyRazorpayPayment(req, res) {
    try {
      const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const customerId = req.user.id;

      const secret = process.env.RAZORPAY_KEY_SECRET || 'quickfix_razorpay_secret_key';
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');

      const isDemo = razorpay_order_id.startsWith('order_demo_');
      const isValid = isDemo || expectedSignature === razorpay_signature;

      if (!isValid) {
        return ResponseHandler.error(res, 'Invalid payment signature verification failed.', null, 400);
      }

      // Update payment record
      await pool.query(
        `UPDATE payments SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'success' WHERE booking_id = ?`,
        [razorpay_payment_id || 'pay_demo_123', razorpay_signature || 'sig_demo_123', booking_id]
      );

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ?`, [booking_id]);
      if (bookings.length > 0) {
        const booking = bookings[0];

        // Credit worker wallet earnings
        if (booking.worker_id) {
          await pool.query(
            `UPDATE wallet SET balance = balance + ? WHERE user_id = ? AND user_type = 'worker'`,
            [booking.worker_earnings, booking.worker_id]
          );

          // Get worker wallet id for transaction log
          const [wallets] = await pool.query(`SELECT id FROM wallet WHERE user_id = ? AND user_type = 'worker'`, [booking.worker_id]);
          if (wallets.length > 0) {
            await pool.query(
              `INSERT INTO transactions (wallet_id, amount, type, category, description, reference_id) 
               VALUES (?, ?, 'credit', 'job_earning', ?, ?)`,
              [wallets[0].id, booking.worker_earnings, `Earnings for booking ${booking.booking_code}`, booking.booking_code]
            );
          }
        }

        const io = req.app.get('io');
        await NotificationService.sendNotification(
          customerId,
          'customer',
          'Payment Successful!',
          `Payment of ₹${booking.total_amount} received for booking #${booking.booking_code}. Invoice is ready for download.`,
          'success',
          `/history.html`,
          io
        );
      }

      return ResponseHandler.success(res, 'Payment verified & booking completed successfully!');
    } catch (err) {
      return ResponseHandler.error(res, 'Payment verification error', err.message, 500);
    }
  }

  // Pay via Cash / Wallet
  static async payViaCashOrWallet(req, res) {
    try {
      const { booking_id, payment_method } = req.body; // 'cash' or 'wallet'
      const customerId = req.user.id;

      const [bookings] = await pool.query(`SELECT * FROM bookings WHERE id = ? AND customer_id = ?`, [booking_id, customerId]);
      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking not found', null, 404);
      }

      const booking = bookings[0];

      if (payment_method === 'wallet') {
        const [wallets] = await pool.query(`SELECT id, balance FROM wallet WHERE user_id = ? AND user_type = 'customer'`, [customerId]);
        const balance = wallets.length > 0 ? parseFloat(wallets[0].balance) : 0;

        if (balance < parseFloat(booking.total_amount)) {
          return ResponseHandler.error(res, 'Insufficient wallet balance. Please top up your wallet.', null, 400);
        }

        // Deduct customer wallet
        await pool.query(`UPDATE wallet SET balance = balance - ? WHERE user_id = ? AND user_type = 'customer'`, [booking.total_amount, customerId]);

        await pool.query(
          `INSERT INTO transactions (wallet_id, amount, type, category, description, reference_id) VALUES (?, ?, 'debit', 'booking_payment', ?, ?)`,
          [wallets[0].id, booking.total_amount, `Paid for booking ${booking.booking_code}`, booking.booking_code]
        );
      }

      // Record Payment
      await pool.query(
        `INSERT INTO payments (booking_id, customer_id, payment_method, amount, status) VALUES (?, ?, ?, ?, 'success')`,
        [booking_id, customerId, payment_method, booking.total_amount]
      );

      // Credit worker wallet earnings
      if (booking.worker_id) {
        await pool.query(
          `UPDATE wallet SET balance = balance + ? WHERE user_id = ? AND user_type = 'worker'`,
          [booking.worker_earnings, booking.worker_id]
        );
      }

      return ResponseHandler.success(res, `Payment of ₹${booking.total_amount} recorded via ${payment_method.toUpperCase()}!`);
    } catch (err) {
      return ResponseHandler.error(res, 'Error processing payment', err.message, 500);
    }
  }

  // Download Invoice PDF
  static async downloadInvoice(req, res) {
    try {
      const { bookingId } = req.params;
      const [bookings] = await pool.query(
        `SELECT b.*, s.name AS service_name, cust.name AS customer_name, w.name AS worker_name 
         FROM bookings b 
         JOIN services s ON b.service_id = s.id 
         JOIN customers cust ON b.customer_id = cust.id 
         LEFT JOIN workers w ON b.worker_id = w.id 
         WHERE b.id = ? OR b.booking_code = ?`,
        [bookingId, bookingId]
      );

      if (bookings.length === 0) {
        return ResponseHandler.error(res, 'Booking invoice not found', null, 404);
      }

      PDFService.generateInvoicePDF(bookings[0], res);
    } catch (err) {
      return ResponseHandler.error(res, 'Error generating invoice PDF', err.message, 500);
    }
  }
}

module.exports = PaymentController;
