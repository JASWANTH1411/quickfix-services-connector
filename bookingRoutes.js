const express = require('express');
const BookingController = require('../controllers/bookingController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Customer creates booking
router.post(
  '/',
  verifyToken,
  authorizeRoles('customer'),
  upload.array('problem_images', 5),
  BookingController.createBooking
);

// Get bookings
router.get('/customer', verifyToken, authorizeRoles('customer'), BookingController.getCustomerBookings);
router.get('/worker', verifyToken, authorizeRoles('worker'), BookingController.getWorkerBookings);
router.get('/available-requests', verifyToken, authorizeRoles('worker'), BookingController.getAvailableRequestsForWorker);
router.get('/:id', verifyToken, BookingController.getBookingDetails);

// Worker job workflow routes
router.post('/accept', verifyToken, authorizeRoles('worker'), BookingController.acceptBooking);
router.post('/mark-reached', verifyToken, authorizeRoles('worker'), BookingController.markReached);
router.post('/start-work', verifyToken, authorizeRoles('worker'), BookingController.startWork);
router.post('/complete-work', verifyToken, authorizeRoles('worker'), upload.single('work_photo'), BookingController.completeWork);

module.exports = router;
