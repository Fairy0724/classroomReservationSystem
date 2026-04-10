const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 提交预约申请
router.post('/', auth, reservationController.createReservation);

// 获取指定教室与日期已占用节次
router.get('/occupied', reservationController.getOccupiedPeriods);

// 获取当前用户预约记录
router.get('/my', auth, reservationController.getMyReservations);

// 管理员：历史预约列表（只读）
router.get('/admin/history', auth, requireAdmin, reservationController.getAdminReservationHistory);

// 获取预约详情（本人）
router.get('/:id', auth, reservationController.getReservationDetail);

// 取消预约（本人）
router.patch('/:id/cancel', auth, reservationController.cancelReservation);

module.exports = router;
