const { pool } = require('../db/db');

/**
 * 获取节次列表
 */
exports.getPeriods = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM class_period ORDER BY period_order ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};
