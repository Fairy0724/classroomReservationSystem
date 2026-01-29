const express = require('express');
const cors = require('cors');
const app = express();

// 跨域
app.use(cors());
// 解析json（头像 base64 可能较大，适当放宽限制）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// 用户相关路由
app.use('/api/user', require('./src/routes/user'));

// 教室相关路由
app.use('/api/classrooms', require('./src/routes/classroom'));

// 教室类型相关路由
app.use('/api/classroom-types', require('./src/routes/classroomType'));

// 预约相关路由
app.use('/api/reservations', require('./src/routes/reservation'));

// 审批相关路由
app.use('/api/approvals', require('./src/routes/approval'));

// 节次相关路由
app.use('/api/class-periods', require('./src/routes/period'));

// 测试接口（验证服务是否能跑）
app.get('/', (req, res) => {
  res.send('教室预约系统后端服务已启动！');
});

module.exports = app;