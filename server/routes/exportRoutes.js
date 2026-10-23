const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, requireCanTrackProgress } = require('../middleware/authMiddleware');

// Export Excel: Admin Tổng (all or specific dept), Người kiểm duyệt (all or specific dept), Admin Cấp 2 (their dept)
router.get('/excel', verifyToken, requireCanTrackProgress, exportController.exportExcel);

module.exports = router;
