const express = require('express');
const router = express.Router();
const classroomTypeController = require('../controllers/classroomTypeController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 获取教室类型列表（公开）
router.get('/', classroomTypeController.listClassroomTypes);

// 管理员：新增教室类型
router.post('/', auth, requireAdmin, classroomTypeController.createClassroomType);

// 管理员：更新教室类型
router.put('/:id', auth, requireAdmin, classroomTypeController.updateClassroomType);

// 管理员：删除教室类型
router.delete('/:id', auth, requireAdmin, classroomTypeController.deleteClassroomType);

module.exports = router;
