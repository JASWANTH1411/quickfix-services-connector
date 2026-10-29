const express = require('express');
const ServiceController = require('../controllers/serviceController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public routes
router.get('/categories', ServiceController.getCategories);
router.get('/category/:categoryId', ServiceController.getServicesByCategory);
router.get('/search', ServiceController.searchServices);

// Admin manage routes
router.post('/categories', verifyToken, authorizeRoles('admin'), upload.single('image'), ServiceController.createCategory);
router.post('/', verifyToken, authorizeRoles('admin'), upload.single('image'), ServiceController.createService);

module.exports = router;
