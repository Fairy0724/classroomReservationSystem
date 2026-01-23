const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const auth = require('../middlewares/auth');

// 提交预约申请
router.post('/', reservationController.createReservation);

// 获取当前用户预约记录
router.get('/my', auth, reservationController.getMyReservations);

module.exports = router;
