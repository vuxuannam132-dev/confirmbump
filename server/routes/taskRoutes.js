const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken, requireAdminTong } = require('../middleware/authMiddleware');

router.get('/', verifyToken, taskController.getTasks);
router.post('/', verifyToken, requireAdminTong, taskController.createTask);
router.delete('/:id', verifyToken, requireAdminTong, taskController.deleteTask);

module.exports = router;
