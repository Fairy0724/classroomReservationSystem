const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// 提交预约申请
router.post('/', reservationController.createReservation);

module.exports = router;
