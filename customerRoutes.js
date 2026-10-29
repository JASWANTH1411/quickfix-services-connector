const express = require('express');
const CustomerController = require('../controllers/customerController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/profile', verifyToken, authorizeRoles('customer'), CustomerController.getProfile);
router.put('/profile', verifyToken, authorizeRoles('customer'), upload.single('avatar'), CustomerController.updateProfile);
router.get('/coupons', verifyToken, CustomerController.getCoupons);

module.exports = router;
