const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 登录接口
router.post('/login', userController.login);

// 获取个人信息
router.get('/profile', auth, userController.getUserInfo);

// 更新个人信息
router.put('/profile', auth, userController.updateUserInfo);

// 修改密码
router.put('/password', auth, userController.changePassword);

// 修改手机号
router.put('/phone', auth, userController.updatePhone);
// 获取个人信息接口
router.get('/info', userController.getUserInfo);

// ==================== 管理员用户管理 ====================
// 列表查询（教师/学生）
router.get('/admin/users', auth, requireAdmin, userController.adminListUsers);
// 院系列表（下拉）
router.get('/admin/departments', auth, requireAdmin, userController.adminListDepartments);
// 创建用户（教师/学生）
router.post('/admin/users', auth, requireAdmin, userController.adminCreateUser);
// 更新用户（教师/学生）
router.put('/admin/users/:id', auth, requireAdmin, userController.adminUpdateUser);
// 删除用户（教师/学生）
router.delete('/admin/users/:id', auth, requireAdmin, userController.adminDeleteUser);
// 重置密码
router.put('/admin/users/:id/reset-password', auth, requireAdmin, userController.adminResetPassword);


module.exports = router;
