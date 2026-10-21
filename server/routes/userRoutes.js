const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin, requireAdminTong } = require('../middleware/authMiddleware');

// Get users: Admin Tổng sees all, Admin 2 sees his department
router.get('/', verifyToken, requireAdmin, userController.getUsers);

// Create user: Admin Tổng creates Admin 2 or User, Admin 2 creates User in his ban
router.post('/', verifyToken, requireAdmin, userController.createUser);

// Admin Tổng only actions
router.put('/:id/approve', verifyToken, requireAdminTong, userController.approveUser);
router.put('/:id/reject', verifyToken, requireAdminTong, userController.rejectUser);
router.put('/:id/change-department', verifyToken, requireAdminTong, userController.changeDepartment);
router.put('/:id/change-role', verifyToken, requireAdminTong, userController.changeRole);

// Delete user: Admin Tổng deletes any user, Admin 2 deletes user in his ban
router.delete('/:id', verifyToken, requireAdmin, userController.deleteUser);

module.exports = router;
