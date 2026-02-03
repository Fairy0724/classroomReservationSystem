// 配置文件
module.exports = {
  dbHost: '127.0.0.1',
  dbPort: 3306,
  dbUser: 'root',
  dbPassword: '123456',
  dbName: 'classroom_reservation',
  // 学期开始日期（用于按周计算课表占用），格式：YYYY-MM-DD
  semesterStartDate: '2026-02-02',
  // 课程表表名（若你的表名不同，请在此修改）
  scheduleTable: 'course_schedule',
  // jwt密钥
  jwtSecret: 'lovexy',
}