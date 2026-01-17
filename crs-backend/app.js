const express = require('express');
const cors = require('cors');
const app = express();

// 跨域
app.use(cors());
// 解析json
app.use(express.json());


// 用户相关路由
app.use('/api/user', require('./src/routes/user'));

// 测试接口（验证服务是否能跑）
app.get('/', (req, res) => {
  res.send('教室预约系统后端服务已启动！');
});

module.exports = app;