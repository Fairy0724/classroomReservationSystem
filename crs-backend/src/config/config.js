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
  // 活动提醒：提前多少分钟发送（默认 120 分钟）
  activityReminderLeadMinutes: 120,
  // 活动提醒：扫描间隔（毫秒）是指定时任务检查活动时间的频率，默认 60 秒
  activityReminderIntervalMs: 60000,
  // jwt密钥
  jwtSecret: 'lovexy',
}