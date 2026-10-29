const pool = require('../config/db');

class NotificationService {
  static async sendNotification(userId, userType, title, message, type = 'info', link = '#', io = null) {
    try {
      const [result] = await pool.query(
        `INSERT INTO notifications (user_id, user_type, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, userType, title, message, type, link]
      );

      const notificationObj = {
        id: result.insertId,
        user_id: userId,
        user_type: userType,
        title,
        message,
        type,
        link,
        is_read: 0,
        created_at: new Date()
      };

      if (io) {
        io.to(`${userType}_${userId}`).emit('notification_received', notificationObj);
      }

      return notificationObj;
    } catch (err) {
      console.error('Failed to save notification:', err.message);
      return null;
    }
  }
}

module.exports = NotificationService;
