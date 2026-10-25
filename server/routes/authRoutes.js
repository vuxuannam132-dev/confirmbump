const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/send-otp', authController.sendOtp);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/2fa/verify', authController.verifyTwoFactor);
router.post('/forgot-password/send-otp', authController.forgotPasswordSendOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);
router.get('/departments', authController.getDepartments);

// Authenticated user security & session routes
router.get('/me', verifyToken, authController.getMe);
router.get('/sessions', verifyToken, authController.getLoginSessions);
router.post('/sessions/trust', verifyToken, authController.trustLoginSession);
router.post('/sessions/revoke', verifyToken, authController.revokeLoginSession);
router.post('/2fa/toggle', verifyToken, authController.toggleTwoFactor);
router.post('/update-avatar', verifyToken, authController.updateAvatar);
router.put('/change-password', verifyToken, authController.changePassword);
router.delete('/delete-my-account', verifyToken, authController.deleteMyAccount);

module.exports = router;
