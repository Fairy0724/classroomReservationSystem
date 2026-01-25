const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');

// 获取节次列表
router.get('/', periodController.getPeriods);

module.exports = router;
