const { pool } = require('../db/db');

// 判断表是否存在（避免表缺失导致 500）
const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables
		 WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows.length > 0;
};

/**
 * 教师待审批列表
 * 规则：仅返回该教师负责教室的预约，且状态为“待审批”
 */
const getPendingApprovals = async (req, res) => {
  try {
    const teacherId = req.user.user_id;

    const [rows] = await pool.query(
      `SELECT r.*, 
							u.real_name AS applicant_name,
							c.building, c.room_num, c.dept_name
			 FROM reservation r
			 LEFT JOIN user u ON r.applicant_id = u.user_id
			 LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
			 WHERE r.status = '待审批'
				 AND r.classroom_id IN (
					 SELECT classroom_id FROM teacher_classroom_relation WHERE teacher_id = ?
				 )
			 ORDER BY r.submitted_at DESC, r.reservation_id DESC`,
      [teacherId]
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 教师审批记录
 * 来源：approval 表 + reservation 关联
 */
const getApprovalRecords = async (req, res) => {
  try {
    const teacherId = req.user.user_id;

    const [rows] = await pool.query(
      `SELECT a.approval_id, a.result, a.reason, a.approval_time,
							r.*, 
							u.real_name AS applicant_name,
							c.building, c.room_num, c.dept_name
			 FROM approval a
			 LEFT JOIN reservation r ON a.reservation_id = r.reservation_id
			 LEFT JOIN user u ON r.applicant_id = u.user_id
			 LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
			 WHERE a.teacher_id = ?
			 ORDER BY a.approval_time DESC, a.approval_id DESC`,
      [teacherId]
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 审批统计
 * - 待审批：reservation.status = 待审批
 * - 已通过/已驳回：approval.result 统计
 */
const getApprovalStats = async (req, res) => {
  try {
    const teacherId = req.user.user_id;

    const hasApprovalTable = await tableExists('approval');
    const hasRelationTable = await tableExists('teacher_classroom_relation');
    if (!hasRelationTable) {
      return res.status(400).json({ msg: '缺少教室-教师关系表 teacher_classroom_relation' });
    }

    const [[pendingRow]] = await pool.query(
      `SELECT COUNT(*) AS count
			 FROM reservation r
			 WHERE r.status = '待审批'
				 AND r.classroom_id IN (
					 SELECT classroom_id FROM teacher_classroom_relation WHERE teacher_id = ?
				 )`,
      [teacherId]
    );

    let approvedCount = 0;
    let rejectedCount = 0;
    if (hasApprovalTable) {
      const [[approvedRow]] = await pool.query(
        `SELECT COUNT(*) AS count FROM approval
				 WHERE teacher_id = ? AND result = '通过'`,
        [teacherId]
      );
      const [[rejectedRow]] = await pool.query(
        `SELECT COUNT(*) AS count FROM approval
				 WHERE teacher_id = ? AND result = '驳回'`,
        [teacherId]
      );
      approvedCount = approvedRow.count;
      rejectedCount = rejectedRow.count;
    }

    res.json({
      data: {
        pending: pendingRow.count,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingRow.count + approvedCount + rejectedCount
      }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 审批详情
 * 仅允许负责该教室的教师查看
 */
const getApprovalDetail = async (req, res) => {
  try {
    const teacherId = req.user.user_id;
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT r.*, 
							u.real_name AS applicant_name,
							c.building, c.room_num, c.dept_name
			 FROM reservation r
			 LEFT JOIN user u ON r.applicant_id = u.user_id
			 LEFT JOIN classroom c ON r.classroom_id = c.classroom_id
			 WHERE r.reservation_id = ?
				 AND r.classroom_id IN (
					 SELECT classroom_id FROM teacher_classroom_relation WHERE teacher_id = ?
				 )
			 LIMIT 1`,
      [id, teacherId]
    );

    if (!rows.length) {
      return res.status(404).json({ msg: '审批记录不存在或无权限查看' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 审批操作（通过/驳回）
 * body: { result: '通过'|'驳回', reason }
 */
const submitApproval = async (req, res) => {
  const { id } = req.params;
  const { result, reason } = req.body || {};
  const teacherId = req.user.user_id;

  if (!['通过', '驳回'].includes(result)) {
    return res.status(400).json({ msg: '审批结果参数错误' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT reservation_id, status, classroom_id
			 FROM reservation
			 WHERE reservation_id = ?
			 LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ msg: '预约记录不存在' });
    }

    const record = rows[0];
    if (record.status !== '待审批') {
      await connection.rollback();
      return res.status(400).json({ msg: '该预约已处理，无法重复审批' });
    }

    const [authRows] = await connection.query(
      `SELECT classroom_id FROM teacher_classroom_relation
			 WHERE teacher_id = ? AND classroom_id = ? LIMIT 1`,
      [teacherId, record.classroom_id]
    );
    if (!authRows.length) {
      await connection.rollback();
      return res.status(403).json({ msg: '无权审批该教室的预约' });
    }

    // 写入审批记录
    await connection.query(
      `INSERT INTO approval (reservation_id, teacher_id, result, reason, approval_time)
			 VALUES (?, ?, ?, ?, NOW())`,
      [id, teacherId, result, reason || null]
    );

    // 更新预约状态与时间
    if (result === '通过') {
      await connection.query(
        `UPDATE reservation SET status = '已通过', approved_at = NOW()
				 WHERE reservation_id = ?`,
        [id]
      );
    } else {
      await connection.query(
        `UPDATE reservation SET status = '已驳回', rejected_at = NOW()
				 WHERE reservation_id = ?`,
        [id]
      );
    }

    await connection.commit();
    res.json({ msg: '审批完成' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPendingApprovals,
  getApprovalRecords,
  getApprovalStats,
  getApprovalDetail,
  submitApproval
};
