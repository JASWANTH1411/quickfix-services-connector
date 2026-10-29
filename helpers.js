const pool = require('../config/db');

// Calculate distance in kilometers between two lat/lng coordinates (Haversine Formula)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 100) / 100;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Generate 6 digit numeric OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique booking code
function generateBookingCode() {
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `QF-${timestamp}-${randomStr}`;
}

// Log user or system action
async function logActivity(userId, userType, action, details = '', ipAddress = '127.0.0.1') {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_type, action, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [userId, userType, action, typeof details === 'object' ? JSON.stringify(details) : details, ipAddress]
    );
  } catch (err) {
    console.error('Error recording activity log:', err.message);
  }
}

module.exports = {
  calculateDistanceKm,
  generateOTP,
  generateBookingCode,
  logActivity
};
