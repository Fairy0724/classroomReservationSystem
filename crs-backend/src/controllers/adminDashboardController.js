const { pool } = require('../db/db');
const {
  buildDashboardData,
  getDashboardReportKey,
  saveReport,
  refreshReportAdminId
} = require('../services/statisticalReportService');

// 管理员首页仪表盘数据
// 处理策略：
// 1) 先读 statistical_report（更快）
// 2) 没有或解析失败时，实时统计并写回报表表
const getDashboardData = async (req, res) => {
  try {
    // 生成当天报表键，保证读到当天快照
    const reportKey = getDashboardReportKey();
    const [rows] = await pool.query(
      `SELECT data FROM statistical_report
       WHERE report_type = ? AND period = ? AND dimension = ?
         AND start_date = ? AND end_date = ?
       ORDER BY generated_at DESC
       LIMIT 1`,
      [
        reportKey.reportType,
        reportKey.period,
        reportKey.dimension,
        reportKey.startDate,
        reportKey.endDate
      ]
    );

    if (rows.length && rows[0].data) {
      try {
        // 报表 JSON 的结构与前端图表所需一致
        const parsed = JSON.parse(rows[0].data);
        // 命中缓存时也刷新 admin_id（仅记录操作人，不重算统计）
        await refreshReportAdminId(reportKey, req.user?.user_id ?? null);
        res.json({ data: parsed });
        return;
      } catch (err) {
        // 解析失败则回退为实时统计
        console.warn('dashboard report parse failed:', err.message);
      }
    }

    // 回退：实时统计并保存，供当天后续访问复用
    const data = await buildDashboardData();
    // 仅管理员手动请求触发的写回记录 admin_id
    const adminId = req.user?.user_id ?? null;
    await saveReport(reportKey, data, adminId);

    res.json({ data });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

module.exports = {
  getDashboardData
};
