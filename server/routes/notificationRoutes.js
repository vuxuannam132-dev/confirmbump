const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, requireAdminTong } = require('../middleware/authMiddleware');

// Get VAPID public key
router.get('/vapid-public-key', notificationController.getVapidPublicKey);

// Subscribe & Unsubscribe to push notifications
router.post('/subscribe', verifyToken, notificationController.subscribePush);
router.post('/unsubscribe', verifyToken, notificationController.unsubscribePush);

// In-app notifications
router.get('/my-notifications', verifyToken, notificationController.getMyNotifications);
router.put('/mark-read', verifyToken, notificationController.markAsRead);

// Send broadcast work announcement (Admin Tổng only)
router.post('/broadcast', verifyToken, requireAdminTong, notificationController.sendBroadcast);

module.exports = router;
