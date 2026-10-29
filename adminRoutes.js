const express = require('express');
const AdminController = require('../controllers/adminController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Guard all admin routes with JWT Admin role
router.use(verifyToken, authorizeRoles('admin'));

router.get('/analytics', AdminController.getDashboardAnalytics);
router.get('/pending-workers', AdminController.getPendingWorkers);
router.post('/verify-worker', AdminController.verifyWorker);
router.get('/pending-bookings', AdminController.getPendingBookings);
router.post('/bookings/approve', AdminController.approveBooking);
router.post('/bookings/reject', AdminController.rejectBooking);
router.get('/customers', AdminController.getCustomers);
router.get('/workers', AdminController.getWorkers);
router.get('/withdraw-requests', AdminController.getWithdrawRequests);
router.post('/withdraw-requests/process', AdminController.processWithdrawRequest);
router.get('/activity-logs', AdminController.getActivityLogs);

module.exports = router;
