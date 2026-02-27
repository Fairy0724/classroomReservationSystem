const express = require('express');
const router = express.Router();
const courseScheduleController = require('../controllers/courseScheduleController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 查询课程表（支持 keyword）
router.get('/', auth, requireAdmin, courseScheduleController.getCourseSchedules);

// 新增课程
router.post('/', auth, requireAdmin, courseScheduleController.createCourseSchedule);

// 更新课程
router.put('/:id', auth, requireAdmin, courseScheduleController.updateCourseSchedule);

// 删除课程
router.delete('/:id', auth, requireAdmin, courseScheduleController.deleteCourseSchedule);

// 批量导入课程
router.post('/import', auth, requireAdmin, courseScheduleController.importCourseSchedules);

module.exports = router;
