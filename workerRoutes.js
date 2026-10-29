const express = require('express');
const WorkerController = require('../controllers/workerController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/profile', verifyToken, authorizeRoles('worker'), WorkerController.getProfile);
router.post('/toggle-status', verifyToken, authorizeRoles('worker'), WorkerController.toggleOnlineStatus);
router.post(
  '/documents',
  verifyToken,
  authorizeRoles('worker'),
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'driving_license', maxCount: 1 },
    { name: 'certificates', maxCount: 1 }
  ]),
  WorkerController.uploadDocuments
);
router.get('/earnings', verifyToken, authorizeRoles('worker'), WorkerController.getEarnings);
router.post('/withdraw', verifyToken, authorizeRoles('worker'), WorkerController.requestWithdrawal);

module.exports = router;
