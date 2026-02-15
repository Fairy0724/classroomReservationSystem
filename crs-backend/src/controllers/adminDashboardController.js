const { pool } = require('../db/db');

// 将日期格式化为 YYYY-MM-DD
const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// 管理员首页仪表盘数据
const getDashboardData = async (req, res) => {
  try {
    // 1) 统计卡片数据
    const [[classroomRow]] = await pool.query('SELECT COUNT(*) AS count FROM classroom');
    const [[userRow]] = await pool.query('SELECT COUNT(*) AS count FROM user');
    const [[reservationRow]] = await pool.query('SELECT COUNT(*) AS count FROM reservation');
    const [[pendingRow]] = await pool.query(
      "SELECT COUNT(*) AS count FROM reservation WHERE status = '待审批'"
    );

    // 2) 教室类型分布（饼图）
    const [typeRows] = await pool.query(
      `SELECT type AS name, COUNT(*) AS value
       FROM classroom
       GROUP BY type
       ORDER BY value DESC`
    );

    // 3) 不同类型教室申请数量（柱状图）
    const [reservationTypeRows] = await pool.query(
      `SELECT c.type AS name, COUNT(*) AS value
       FROM reservation r
       LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
       WHERE r.status IN ('待审批','已通过')
       GROUP BY c.type
       ORDER BY value DESC`
    );

    // 4) 近一周预约趋势（折线图）
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }

    const [trendRows] = await pool.query(
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

    // 5) 热门教室排行（预约次数）
    const [hotRows] = await pool.query(
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

    res.json({
      data: {
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
      }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

module.exports = {
  getDashboardData
};
