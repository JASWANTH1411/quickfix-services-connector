const pool = require('../config/db');

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // Join User Private Room
    socket.on('join_room', (data) => {
      const { userId, userType } = data; // userType: 'customer', 'worker', 'admin'
      if (userId && userType) {
        const roomName = `${userType}_${userId}`;
        socket.join(roomName);
        console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
      }
    });

    // Real-time Worker Location Updates
    socket.on('worker_location_update', async (data) => {
      const { workerId, latitude, longitude, customerId, bookingId } = data;

      try {
        // Update location in database
        await pool.query(
          `INSERT INTO worker_locations (worker_id, latitude, longitude, last_updated) 
           VALUES (?, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?, last_updated = NOW()`,
          [workerId, latitude, longitude, latitude, longitude]
        );

        // Forward location update to customer if actively tracking
        if (customerId) {
          io.to(`customer_${customerId}`).emit('worker_location_live', {
            workerId,
            latitude,
            longitude,
            bookingId,
            updatedAt: new Date()
          });
        }
      } catch (err) {
        console.error('Error handling worker location socket event:', err.message);
      }
    });

    // Real-time Chat Messages
    socket.on('send_message', async (data) => {
      const { bookingId, senderId, senderType, receiverId, receiverType, message } = data;

      try {
        const [result] = await pool.query(
          `INSERT INTO messages (booking_id, sender_id, sender_type, receiver_id, receiver_type, message) VALUES (?, ?, ?, ?, ?, ?)`,
          [bookingId, senderId, senderType, receiverId, receiverType, message]
        );

        const msgPayload = {
          id: result.insertId,
          bookingId,
          senderId,
          senderType,
          receiverId,
          receiverType,
          message,
          created_at: new Date()
        };

        // Send to receiver's room
        io.to(`${receiverType}_${receiverId}`).emit('receive_message', msgPayload);
        socket.emit('message_sent_confirm', msgPayload);
      } catch (err) {
        console.error('Error sending chat message:', err.message);
      }
    });

    // Typing Indicator
    socket.on('typing_indicator', (data) => {
      const { receiverId, receiverType, isTyping } = data;
      io.to(`${receiverType}_${receiverId}`).emit('user_typing', { isTyping });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = setupSocketIO;
