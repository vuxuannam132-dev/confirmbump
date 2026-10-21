const express = require('express');
const router = express.Router();
const confirmController = require('../controllers/confirmController');
const { verifyToken, requireAdmin, requireAdminTong } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Member submits confirm proof - accept both multiple 'images' (up to 10) and legacy single 'image'
const uploadConfirmProof = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 }
]);

router.post('/submit', verifyToken, uploadConfirmProof, confirmController.submitConfirm);

// Personal history
router.get('/my-history', verifyToken, confirmController.getMyHistory);

// Progress tracking for Admin Cấp 2 and Admin Tổng
router.get('/progress', verifyToken, requireAdmin, confirmController.getProgress);

// Review queue & approve/reject: ONLY Admin Tổng
router.get('/review-queue', verifyToken, requireAdminTong, confirmController.getReviewQueue);
router.put('/:id/review', verifyToken, requireAdminTong, confirmController.reviewConfirm);

module.exports = router;
