const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

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


module.exports = router;
