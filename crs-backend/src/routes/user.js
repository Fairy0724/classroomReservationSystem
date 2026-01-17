const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 登录接口
router.post('/login', userController.login);

module.exports = router;
