const express = require('express');
const ReviewController = require('../controllers/reviewController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, authorizeRoles('customer'), ReviewController.addReview);
router.get('/worker/:workerId', ReviewController.getWorkerReviews);

module.exports = router;
