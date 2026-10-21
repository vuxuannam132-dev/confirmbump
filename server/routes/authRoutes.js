const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/send-otp', authController.sendOtp);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password/send-otp', authController.forgotPasswordSendOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);
router.get('/departments', authController.getDepartments);
router.get('/me', verifyToken, authController.getMe);
router.delete('/delete-my-account', verifyToken, authController.deleteMyAccount);

module.exports = router;
