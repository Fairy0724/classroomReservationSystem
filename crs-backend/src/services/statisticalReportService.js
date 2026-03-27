// 管理员首页报表的构建与保存工具
const db = require('../db/db');

// 统一日期格式为 YYYY-MM-DD，用于报表键与日期对比
const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// 生成管理员首页“当日”报表的唯一键
// 如需扩展周报/月报，可在这里调整 period/startDate/endDate
const getDashboardReportKey = () => {
  const today = formatDate(new Date());
  return {
    reportType: 'admin_dashboard',
    period: 'day',
    dimension: 'overall',
    startDate: today,
    endDate: today
  };
};

// 保存报表（类似 upsert）：同一键已存在则覆盖
// adminId 仅用于“管理员手动触发写入”的场景，定时任务不传
const saveReport = async (reportKey, data, adminId = null) => {
  const [existing] = await db.pool.query(
    `SELECT report_id FROM statistical_report
     WHERE report_type = ? AND period = ? AND dimension = ?
       AND start_date = ? AND end_date = ?
     LIMIT 1`,
    [
      reportKey.reportType,
      reportKey.period,
      reportKey.dimension,
      reportKey.startDate,
      reportKey.endDate
    ]
  );

  if (existing.length) {
    if (adminId !== null && adminId !== undefined) {
      await db.pool.query(
        `UPDATE statistical_report
         SET data = ?, generated_at = NOW(), admin_id = ?
         WHERE report_id = ?`,
        [JSON.stringify(data), adminId, existing[0].report_id]
      );
    } else {
      await db.pool.query(
        `UPDATE statistical_report
         SET data = ?, generated_at = NOW()
         WHERE report_id = ?`,
        [JSON.stringify(data), existing[0].report_id]
      );
    }
    return;
  }

  if (adminId !== null && adminId !== undefined) {
    await db.pool.query(
      `INSERT INTO statistical_report
       (report_type, period, dimension, data, start_date, end_date, generated_at, admin_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        reportKey.reportType,
        reportKey.period,
        reportKey.dimension,
        JSON.stringify(data),
        reportKey.startDate,
        reportKey.endDate,
        adminId
      ]
    );
  } else {
    await db.pool.query(
      `INSERT INTO statistical_report
       (report_type, period, dimension, data, start_date, end_date, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        reportKey.reportType,
        reportKey.period,
        reportKey.dimension,
        JSON.stringify(data),
        reportKey.startDate,
        reportKey.endDate
      ]
    );
  }
};

// 仅刷新报表的管理员操作人，不修改统计数据与生成时间
const refreshReportAdminId = async (reportKey, adminId) => {
  if (adminId === null || adminId === undefined) {
    return;
  }

  await db.pool.query(
    `UPDATE statistical_report
     SET admin_id = ?
     WHERE report_type = ? AND period = ? AND dimension = ?
       AND start_date = ? AND end_date = ?`,
    [
      adminId,
      reportKey.reportType,
      reportKey.period,
      reportKey.dimension,
      reportKey.startDate,
      reportKey.endDate
    ]
  );
};

// 汇总管理员首页所有统计数据（图表+卡片）
// 逻辑与原先实时查询一致，但现在可复用为报表生成
const buildDashboardData = async () => {
  const [[classroomRow]] = await db.pool.query('SELECT COUNT(*) AS count FROM classroom');
  const [[userRow]] = await db.pool.query('SELECT COUNT(*) AS count FROM user');
  const [[reservationRow]] = await db.pool.query('SELECT COUNT(*) AS count FROM reservation');
  const [[pendingRow]] = await db.pool.query(
    "SELECT COUNT(*) AS count FROM reservation WHERE status = '待审批'"
  );

  const [typeRows] = await db.pool.query(
    `SELECT COALESCE(ct.type_name, '未分类') AS name, COUNT(*) AS value
     FROM classroom c
     LEFT JOIN classroom_type ct ON c.type = ct.type_id
     GROUP BY COALESCE(ct.type_name, '未分类')
     ORDER BY value DESC`
  );

  const [reservationTypeRows] = await db.pool.query(
    `SELECT COALESCE(ct.type_name, '未分类') AS name, COUNT(*) AS value
     FROM reservation r
     LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
     LEFT JOIN classroom_type ct ON c.type = ct.type_id
     WHERE r.status IN ('待审批','已通过')
     GROUP BY COALESCE(ct.type_name, '未分类')
     ORDER BY value DESC`
  );

  // 生成近 7 天（含今天）的固定日期窗口
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }

  const [trendRows] = await db.pool.query(
    `SELECT date, COUNT(*) AS value
     FROM reservation
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY date
     ORDER BY date ASC`
  );

  const trendMap = new Map(
    trendRows.map(row => [formatDate(new Date(row.date)), row.value])
  );
  const trendValues = dates.map(d => trendMap.get(d) || 0);

  const [hotRows] = await db.pool.query(
    `SELECT r.classroom_id, c.building, c.room_num, COUNT(*) AS value
     FROM reservation r
     LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
     WHERE r.status IN ('待审批','已通过')
     GROUP BY r.classroom_id, c.building, c.room_num
     ORDER BY value DESC
     LIMIT 5`
  );

  const hotClassrooms = hotRows.map(row => ({
    name: `${row.building || ''}${row.room_num || ''}` || `教室${row.classroom_id}`,
    value: row.value
  }));

  return {
    stats: {
      classroomCount: classroomRow?.count || 0,
      userCount: userRow?.count || 0,
      reservationCount: reservationRow?.count || 0,
      pendingCount: pendingRow?.count || 0
    },
    classroomTypeStats: typeRows,
    reservationTypeStats: reservationTypeRows,
    weeklyTrend: {
      dates,
      values: trendValues
    },
    hotClassrooms
  };
};

module.exports = {
  buildDashboardData,
  getDashboardReportKey,
  formatDate,
  saveReport,
  refreshReportAdminId
};
