// 定期扫描预约并发提醒
const db = require('../db/db');
const { notifyUser } = require('../ws/wsHub');
const {
  activityReminderLeadMinutes,
  activityReminderIntervalMs
} = require('../config/config');

// 将 Date 转为 MySQL DATETIME 字符串
const toMysqlDateTime = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

// 发送活动提醒
const runReminderJob = async () => {
  try {
    // 避免模块初始化时序导致 pool 尚未挂载
    if (!db.pool) return;

    const now = new Date();
    const leadMinutes = Number(activityReminderLeadMinutes || 60);
    const end = new Date(now.getTime() + leadMinutes * 60 * 1000);

    const startText = toMysqlDateTime(now);
    const endText = toMysqlDateTime(end);

    // 查找即将开始的已通过预约
    const [rows] = await db.pool.query(
      `SELECT r.reservation_id, r.applicant_id, r.activity_name, r.date, r.start_time, r.end_time,
              c.building, c.room_num
       FROM reservation r
       LEFT JOIN classroom c ON c.classroom_id = r.classroom_id
       WHERE r.status = '已通过'
         AND r.start_time IS NOT NULL
         AND r.date IS NOT NULL
         AND TIMESTAMP(r.date, r.start_time) BETWEEN ? AND ?`,
      [startText, endText]
    );

    if (!rows.length) return;

    for (const item of rows) {
      const activityName = item.activity_name || '活动';
      const dateText = String(item.date || '').slice(0, 10) || '--';
      const startText = String(item.start_time || '').slice(0, 5) || '--';
      const endText = String(item.end_time || '').slice(0, 5) || '--';
      const classroomName = `${item.building || ''}${item.room_num || ''}` || '教室';
      const title = '教室预约活动即将开始';
      const content = `您预约的 ${classroomName} 活动将于${dateText} ${startText} 开始，请提前到达教室。\n活动信息：${activityName}，日期：${dateText}，时段：${startText}-${endText}。\n请保持场地整洁，祝您活动顺利！`;

      const [exists] = await db.pool.query(
        `SELECT message_id FROM message
         WHERE user_id = ? AND type = 'activity_reminder' AND content = ?
         LIMIT 1`,
        [item.applicant_id, content]
      );

      if (exists.length) continue;

      const [insertRes] = await db.pool.query(
        `INSERT INTO message (user_id, type, title, content, send_time, is_read)
         VALUES (?, 'activity_reminder', ?, ?, NOW(), 0)`,
        [item.applicant_id, title, content]
      );
      // 先落库再推送：
      // 1) message 表保证消息可追溯
      // 2) WebSocket 让在线用户即时看到提醒
      notifyUser(item.applicant_id, {
        event: 'message:new',
        data: {
          messageId: insertRes?.insertId || null,
          type: 'activity_reminder',
          title,
          sendTime: new Date().toISOString()
        }
      });
    }
  } catch (err) {
    console.warn('activity reminder job failed:', err.message);
  }
};

const startActivityReminderJob = () => {
  const interval = Number(activityReminderIntervalMs || 60000);
  runReminderJob();
  return setInterval(runReminderJob, interval);
};

module.exports = {
  startActivityReminderJob
};
