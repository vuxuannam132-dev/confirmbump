const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Export Excel: Admin Tổng (all or specific dept), Admin Cấp 2 (their dept)
router.get('/excel', verifyToken, requireAdmin, exportController.exportExcel);

module.exports = router;
