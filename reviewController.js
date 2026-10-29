const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');

class ReviewController {
  // Post Rating & Review for Worker
  static async addReview(req, res) {
    try {
      const customerId = req.user.id;
      const { booking_id, worker_id, rating, comment } = req.body;

      const [existing] = await pool.query(`SELECT id FROM ratings WHERE booking_id = ?`, [booking_id]);
      if (existing.length > 0) {
        return ResponseHandler.error(res, 'Review already submitted for this booking.', null, 400);
      }

      await pool.query(
        `INSERT INTO ratings (booking_id, customer_id, worker_id, rating) VALUES (?, ?, ?, ?)`,
        [booking_id, customerId, worker_id, rating]
      );

      if (comment && comment.trim() !== '') {
        await pool.query(
          `INSERT INTO reviews (booking_id, customer_id, worker_id, comment) VALUES (?, ?, ?, ?)`,
          [booking_id, customerId, worker_id, comment]
        );
      }

      // Recalculate Worker Average Rating
      const [avgResult] = await pool.query(
        `SELECT AVG(rating) AS avg_rating, COUNT(id) AS total_reviews FROM ratings WHERE worker_id = ?`,
        [worker_id]
      );

      const newAvg = Math.round(parseFloat(avgResult[0].avg_rating || 5.0) * 100) / 100;
      const totalReviews = avgResult[0].total_reviews || 0;

      await pool.query(
        `UPDATE workers SET rating_avg = ?, total_reviews = ? WHERE id = ?`,
        [newAvg, totalReviews, worker_id]
      );

      return ResponseHandler.success(res, 'Thank you! Rating and review submitted successfully.');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to submit review', err.message, 500);
    }
  }

  // Get Reviews for Worker
  static async getWorkerReviews(req, res) {
    try {
      const { workerId } = req.params;
      const [reviews] = await pool.query(
        `SELECT r.comment, rat.rating, r.created_at, cust.name AS customer_name, cust.avatar AS customer_avatar
         FROM ratings rat
         JOIN customers cust ON rat.customer_id = cust.id
         LEFT JOIN reviews r ON rat.booking_id = r.booking_id
         WHERE rat.worker_id = ?
         ORDER BY rat.id DESC`,
        [workerId]
      );

      return ResponseHandler.success(res, 'Worker reviews fetched', reviews);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching reviews', err.message, 500);
    }
  }
}

module.exports = ReviewController;
