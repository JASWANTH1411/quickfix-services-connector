const express = require('express');
const PaymentController = require('../controllers/paymentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/razorpay/order', verifyToken, authorizeRoles('customer'), PaymentController.createRazorpayOrder);
router.post('/razorpay/verify', verifyToken, authorizeRoles('customer'), PaymentController.verifyRazorpayPayment);
router.post('/pay-direct', verifyToken, authorizeRoles('customer'), PaymentController.payViaCashOrWallet);
router.get('/invoice/:bookingId', PaymentController.downloadInvoice);

module.exports = router;
