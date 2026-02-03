// 预约控制器（数据库版）
const { pool } = require('../db/db');
const { semesterStartDate, scheduleTable } = require('../config/config');

// ==================== 课表占用辅助方法 ====================
const normalizeDateOnly = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// 将日期转换为学期周次（从 1 开始）
const getSemesterWeek = (dateStr) => {
  if (!semesterStartDate) return null;
  const start = normalizeDateOnly(semesterStartDate);
  const current = normalizeDateOnly(dateStr);
  if (!start || !current) return null;
  const diff = current.getTime() - start.getTime();
  if (diff < 0) return null;
  return Math.floor(diff / 86400000 / 7) + 1;
};

// 将日期转换为星期数（1-7，周一=1，周日=7）
const getWeekday = (dateStr) => {
  const d = normalizeDateOnly(dateStr);
  if (!d) return null;
  const day = d.getDay();
  return day === 0 ? 7 : day;
};

// 获取某教室在指定日期的课程占用节次
const getScheduleOccupiedPeriods = async (classroomId, dateStr) => {
  const weekNo = getSemesterWeek(dateStr);
  const weekday = getWeekday(dateStr);
  if (!weekNo || !weekday) return [];

  const table = scheduleTable || 'schedule';
  const [rows] = await pool.query(
    `SELECT period_id FROM ${table}
     WHERE classroom_id = ? AND weekday = ?
       AND start_week <= ? AND end_week >= ?`,
    [classroomId, weekday, weekNo, weekNo]
  );

  return rows
    .map(row => Number(row.period_id))
    .filter(id => !Number.isNaN(id));
};

/**
 * 提交预约申请
 * body: {
 *   classroomId, userId, role,
 *   date, startTime, endTime,
 *   timeSlots[], attendeeCount,
 *   activityName, activityType, purpose
 * }
 */
const findTeacherMappingTable = async () => 'teacher_classroom_relation';
const createReservation = async (req, res) => {
  const {
    classroomId,
    userId: bodyUserId,
    role: bodyRole,
    date,
    startTime,
    endTime,
    timeSlots,
    periodIds,
    attendeeCount,
    activityName,
    activityType,
    purpose
  } = req.body || {};

  try {
    // 1. 统一用户信息（优先使用 token）
    const userId = req.user?.user_id || bodyUserId;
    const role = req.user?.role || bodyRole;

    // 2. 基础必填校验
    if (!classroomId || !userId || !date || !attendeeCount || !activityName || !purpose) {
      return res.status(400).json({ msg: '参数不完整' });
    }

    // 2. 日期校验（未来30天内）
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    if (selectedDate < today || selectedDate > maxDate) {
      return res.status(400).json({ msg: '请选择未来一月的有效日期' });
    }

    // 3. 人数校验
    if (Number(attendeeCount) <= 0) {
      return res.status(400).json({ msg: '参与人数请输入正整数' });
    }

    // 4. 解析时间段
    let start = startTime;
    let end = endTime;
    if ((!start || !end) && Array.isArray(timeSlots)) {
      const times = timeSlots
        .map(label => {
          const match = String(label).match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
          return match ? { start: match[1], end: match[2] } : null;
        })
        .filter(Boolean);
      if (times.length) {
        const starts = times.map(t => t.start).sort();
        const ends = times.map(t => t.end).sort();
        start = starts[0];
        end = ends[ends.length - 1];
      }
    }

    if (!start || !end) {
      return res.status(400).json({ msg: '请选择预约时段' });
    }

    // 5. 校验教室状态与容量
    const [classroomRows] = await pool.query(
      'SELECT classroom_id, capacity, status FROM classroom WHERE classroom_id = ? LIMIT 1',
      [classroomId]
    );
    if (!classroomRows.length) {
      return res.status(404).json({ msg: '教室不存在' });
    }
    const classroom = classroomRows[0];
    if (classroom.status && classroom.status !== '可用' && classroom.status !== 'available') {
      return res.status(400).json({ msg: '该教室当前不可预约' });
    }
    if (Number(attendeeCount) > Number(classroom.capacity)) {
      return res.status(400).json({ msg: '参与人数不得超过教室最大容量人数' });
    }

    // 6. 冲突检测（同教室+同日期+时间段重叠）
    const [conflictRows] = await pool.query(
      `SELECT reservation_id FROM reservation
       WHERE classroom_id = ? AND date = ?
         AND status IN ('待审批','已通过')
         AND NOT (end_time <= ? OR start_time >= ?)
       LIMIT 1`,
      [classroomId, date, start, end]
    );
    if (conflictRows.length) {
      return res.status(409).json({ msg: '该时段已被占用' });
    }

    // 7. 找到负责该教室的老师（用于流转审批）
    const mappingTable = await findTeacherMappingTable();
    if (!mappingTable) {
      return res.status(400).json({ msg: '未找到教室-教师映射表，请检查数据库表名' });
    }

    const [teacherRows] = await pool.query(
      `SELECT teacher_id FROM ${mappingTable} WHERE classroom_id = ? ORDER BY id ASC LIMIT 1`,
      [classroomId]
    );
    const assignedTeacherId = teacherRows.length ? teacherRows[0].teacher_id : null;
    if (!assignedTeacherId) {
      return res.status(400).json({ msg: '未配置该教室的负责人老师' });
    }

    // 8. 状态规则：教师教学申请直接通过
    const isTeaching = String(activityType) === '教学';
    const status = role === 'teacher' && isTeaching ? '已通过' : '待审批';
    const normalizedPeriodIds = Array.isArray(periodIds)
      ? periodIds
      : Array.isArray(timeSlots)
        ? timeSlots
        : [];

    // 8.1 课程表冲突校验（同教室、同日期、同节次）
    if (normalizedPeriodIds.length) {
      const scheduleOccupied = await getScheduleOccupiedPeriods(classroomId, date);
      const scheduleSet = new Set(scheduleOccupied.map(id => Number(id)));
      const hasConflict = normalizedPeriodIds.some(id => scheduleSet.has(Number(id)));
      if (hasConflict) {
        return res.status(409).json({ msg: '该时段已被课程占用' });
      }
    }

    // 9. 写入预约记录（时间字段交给数据库默认值）
    const [result] = await pool.query(
      `INSERT INTO reservation
      (applicant_id, classroom_id, period_ids, date, start_time, end_time,
       activity_name, activity_type, participant_count, purpose,
       status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        userId,
        classroomId,
        JSON.stringify(normalizedPeriodIds),
        date,
        start,
        end,
        activityName,
        activityType || '自习',
        attendeeCount,
        purpose,
        status
      ]
    );

    // 10. 写入审批记录（待审批/自动通过）
    if (assignedTeacherId) {
      const approvalResult = status === '已通过' ? '通过' : '待审批';
      try {
        await pool.query(
          `INSERT INTO approval_record (reservation_id, applicant_id, teacher_id, result, reason, approval_time)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [result.insertId, userId, assignedTeacherId, approvalResult, null]
        );
      } catch (err) {
        // 审批记录写入失败不影响预约主流程
      }
    }

    if (status === '已通过') {
      await pool.query(
        `UPDATE reservation SET approved_at = NOW() WHERE reservation_id = ?`,
        [result.insertId]
      );
    }

    res.json({
      msg: '预约申请已提交',
      data: {
        reservationId: result.insertId,
        status,
        assignedTeacherId
      }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 获取指定教室与日期的已占用节次
 * query: classroomId, date
 */
const getOccupiedPeriods = async (req, res) => {
  try {
    const { classroomId, date } = req.query || {};
    if (!classroomId || !date) {
      return res.status(400).json({ msg: '缺少必要参数' });
    }

    const [rows] = await pool.query(
      `SELECT period_ids FROM reservation
       WHERE classroom_id = ? AND date = ?
         AND status IN ('待审批','已通过')`,
      [classroomId, date]
    );

    const occupied = rows
      .map(row => {
        const value = row.period_ids;
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object') return Array.from(value);
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (err) {
            return [];
          }
        }
        return [];
      })
      .flat()
      .map(id => Number(id))
      .filter(id => !Number.isNaN(id));

    // 合并课程表占用
    const scheduleOccupied = await getScheduleOccupiedPeriods(classroomId, date);
    const merged = [...new Set([...occupied, ...scheduleOccupied])];

    res.json({ data: merged });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 获取当前用户的预约记录
 * 需要鉴权，从 token 获取 user_id
 */
const getMyReservations = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await pool.query(
      'SELECT * FROM reservation WHERE applicant_id = ? ORDER BY reservation_id DESC',
      [userId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ msg: '获取预约记录失败', error: err.message });
  }
};

/**
 * 获取预约详情（只允许本人查看）
 * params: id
 */
const getReservationDetail = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM reservation WHERE reservation_id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ msg: '预约记录不存在' });
    }

    const record = rows[0];
    if (String(record.applicant_id) !== String(userId)) {
      return res.status(403).json({ msg: '无权查看该预约' });
    }

    res.json({ data: record });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

/**
 * 取消预约（只允许本人操作）
 * params: id
 */
const cancelReservation = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT reservation_id, applicant_id, status FROM reservation WHERE reservation_id = ? LIMIT 1',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ msg: '预约记录不存在' });
    }

    const record = rows[0];
    if (String(record.applicant_id) !== String(userId)) {
      return res.status(403).json({ msg: '无权取消该预约' });
    }

    if (['已取消', '已驳回'].includes(record.status)) {
      return res.status(400).json({ msg: '该预约已结束，无法取消' });
    }

    await pool.query(
      'UPDATE reservation SET status = ?, rejected_at = NOW() WHERE reservation_id = ?'
      ,
      ['已取消', id]
    );

    res.json({ msg: '预约已取消' });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

module.exports = {
  createReservation,
  getMyReservations,
  getOccupiedPeriods,
  getReservationDetail,
  cancelReservation
};
