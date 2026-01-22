const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');

// 获取教室列表或单个教室（支持 query 参数 id / keyword）
router.get('/', classroomController.getClassrooms);

module.exports = router;
