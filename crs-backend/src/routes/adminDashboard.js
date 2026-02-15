const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 管理员首页仪表盘数据
router.get('/dashboard', auth, requireAdmin, adminDashboardController.getDashboardData);

module.exports = router;
