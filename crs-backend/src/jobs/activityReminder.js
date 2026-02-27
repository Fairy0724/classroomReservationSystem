// 定期扫描预约并发提醒
const { pool } = require('../db/db');
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
    const now = new Date();
    const leadMinutes = Number(activityReminderLeadMinutes || 60);
    const end = new Date(now.getTime() + leadMinutes * 60 * 1000);

    const startText = toMysqlDateTime(now);
    const endText = toMysqlDateTime(end);

    // 查找即将开始的已通过预约
    const [rows] = await pool.query(
      `SELECT reservation_id, applicant_id, activity_name, date, start_time
       FROM reservation
       WHERE status = '已通过'
         AND start_time IS NOT NULL
         AND date IS NOT NULL
         AND TIMESTAMP(date, start_time) BETWEEN ? AND ?`,
      [startText, endText]
    );

    if (!rows.length) return;

    for (const item of rows) {
      const activityName = item.activity_name || '活动';
      const startTime = `${item.date} ${String(item.start_time).slice(0, 5)}`;
      const title = '活动提醒通知';
      const content = `您预约的【${activityName}】将于 ${startTime} 开始，请准时使用并保持教室整洁`;

      const [exists] = await pool.query(
        `SELECT message_id FROM message
         WHERE user_id = ? AND type = 'activity_reminder' AND content = ?
         LIMIT 1`,
        [item.applicant_id, content]
      );

      if (exists.length) continue;

      await pool.query(
        `INSERT INTO message (user_id, type, title, content, send_time, is_read)
         VALUES (?, 'activity_reminder', ?, ?, NOW(), 0)`,
        [item.applicant_id, title, content]
      );
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
