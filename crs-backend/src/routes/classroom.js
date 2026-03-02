const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 获取教室列表或单个教室（支持 query 参数 id / keyword）
router.get('/', classroomController.getClassrooms);

// 获取教室负责教师（teacher_classroom_relation）
router.get('/:id/teacher', classroomController.getResponsibleTeacher);

// 管理员：新增教室
router.post('/', auth, requireAdmin, classroomController.createClassroom);

// 管理员：更新教室
router.put('/:id', auth, requireAdmin, classroomController.updateClassroom);

// 管理员：删除教室
router.delete('/:id', auth, requireAdmin, classroomController.deleteClassroom);

module.exports = router;
