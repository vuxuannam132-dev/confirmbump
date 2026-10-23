const express = require('express');
const router = express.Router();
const confirmController = require('../controllers/confirmController');
const { 
  verifyToken, 
  requireAdmin, 
  requireAdminTong, 
  requireCanReview, 
  requireCanTrackProgress 
} = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Member submits confirm proof - accept both multiple 'images' (up to 10) and legacy single 'image'
const uploadConfirmProof = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 }
]);

router.post('/submit', verifyToken, uploadConfirmProof, confirmController.submitConfirm);

// Personal history
router.get('/my-history', verifyToken, confirmController.getMyHistory);

// Progress tracking & Unconfirmed list for Admin Cấp 2, Người kiểm duyệt, and Admin Tổng
router.get('/progress', verifyToken, requireCanTrackProgress, confirmController.getProgress);
router.get('/unconfirmed', verifyToken, requireCanTrackProgress, confirmController.getUnconfirmed);

// Review queue & approve/reject: Admin Tổng & Người kiểm duyệt (cả 4 ban)
router.get('/review-queue', verifyToken, requireCanReview, confirmController.getReviewQueue);
router.put('/:id/review', verifyToken, requireCanReview, confirmController.reviewConfirm);

// Storage status (Only Admin Tổng)
router.get('/storage-status', verifyToken, requireAdminTong, confirmController.getStorageStatus);

module.exports = router;
