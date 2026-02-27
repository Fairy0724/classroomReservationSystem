// 课程表管理控制器（course_schedule 表）
const { pool } = require('../db/db');
const { scheduleTable } = require('../config/config');

const TABLE_NAME = scheduleTable || 'course_schedule';

// 数据库行 -> 前端对象
const mapRow = (row) => {
  return {
    scheduleId: row.schedule_id,
    classroomId: row.classroom_id,
    courseName: row.course_name,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    periodId: row.period_id,
    className: row.class_name,
    weekday: row.weekday,
    startWeek: row.start_week,
    endWeek: row.end_week
  };
};

// 校验周次与星期的合法性
const validateSchedule = (payload) => {
  const weekday = Number(payload.weekday);
  const startWeek = Number(payload.startWeek);
  const endWeek = Number(payload.endWeek);

  if (!Number.isFinite(weekday) || weekday < 1 || weekday > 7) {
    return '星期范围应为 1-7';
  }
  if (!Number.isFinite(startWeek) || !Number.isFinite(endWeek) || startWeek < 1 || endWeek < 1) {
    return '起始周/结束周必须为正整数';
  }
  if (startWeek > endWeek) {
    return '起始周不能大于结束周';
  }
  return null;
};

/**
 * 查询课程表
 * 支持 keyword：按课程名/教师名/班级/教室ID 模糊筛选
 */
const getCourseSchedules = async (req, res) => {
  const { keyword } = req.query;

  try {
    let sql = `SELECT * FROM ${TABLE_NAME}`;
    const params = [];

    if (keyword) {
      sql += `
        WHERE course_name LIKE ?
           OR teacher_name LIKE ?
           OR class_name LIKE ?
           OR CAST(classroom_id AS CHAR) LIKE ?`;
      const key = `%${keyword}%`;
      params.push(key, key, key, key);
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(mapRow));
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 新增课程
 * 必填：classroomId/courseName/teacherName/periodId/className/weekday/startWeek/endWeek
 */
const createCourseSchedule = async (req, res) => {
  try {
    const {
      classroomId,
      courseName,
      teacherId,
      teacherName,
      periodId,
      className,
      weekday,
      startWeek,
      endWeek
    } = req.body || {};

    if (!classroomId || !courseName || !teacherName || !periodId || !className) {
      return res.status(400).json({ msg: '教室ID/课程名称/教师姓名/节次ID/班级为必填项' });
    }

    const errorMsg = validateSchedule({ weekday, startWeek, endWeek });
    if (errorMsg) {
      return res.status(400).json({ msg: errorMsg });
    }

    await pool.query(
      `INSERT INTO ${TABLE_NAME}
       (classroom_id, course_name, teacher_id, teacher_name, period_id, class_name, weekday, start_week, end_week)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(classroomId),
        courseName,
        teacherId ? Number(teacherId) : null,
        teacherName,
        Number(periodId),
        className,
        Number(weekday),
        Number(startWeek),
        Number(endWeek)
      ]
    );

    res.json({ msg: '新增成功' });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 更新课程
 * 仅更新传入字段，未传入的保持不变
 */
const updateCourseSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const fields = [];
    const values = [];

    if (payload.classroomId !== undefined) {
      fields.push('classroom_id = ?');
      values.push(Number(payload.classroomId));
    }
    if (payload.courseName !== undefined) {
      fields.push('course_name = ?');
      values.push(payload.courseName);
    }
    if (payload.teacherId !== undefined) {
      fields.push('teacher_id = ?');
      values.push(payload.teacherId ? Number(payload.teacherId) : null);
    }
    if (payload.teacherName !== undefined) {
      fields.push('teacher_name = ?');
      values.push(payload.teacherName);
    }
    if (payload.periodId !== undefined) {
      fields.push('period_id = ?');
      values.push(Number(payload.periodId));
    }
    if (payload.className !== undefined) {
      fields.push('class_name = ?');
      values.push(payload.className);
    }
    if (payload.weekday !== undefined) {
      fields.push('weekday = ?');
      values.push(Number(payload.weekday));
    }
    if (payload.startWeek !== undefined) {
      fields.push('start_week = ?');
      values.push(Number(payload.startWeek));
    }
    if (payload.endWeek !== undefined) {
      fields.push('end_week = ?');
      values.push(Number(payload.endWeek));
    }

    if (!fields.length) {
      return res.status(400).json({ msg: '没有可更新的字段' });
    }

    // 只有当周次字段成对出现时才做范围校验
    if (payload.weekday !== undefined || payload.startWeek !== undefined || payload.endWeek !== undefined) {
      const errorMsg = validateSchedule({
        weekday: payload.weekday ?? 1,
        startWeek: payload.startWeek ?? 1,
        endWeek: payload.endWeek ?? 1
      });
      if (errorMsg) {
        return res.status(400).json({ msg: errorMsg });
      }
    }

    values.push(id);
    await pool.query(`UPDATE ${TABLE_NAME} SET ${fields.join(', ')} WHERE schedule_id = ?`, values);

    res.json({ msg: '更新成功' });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 删除课程
 */
const deleteCourseSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ${TABLE_NAME} WHERE schedule_id = ?`, [id]);
    res.json({ msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 批量导入课程
 * body: { items: [ { classroomId, courseName, teacherId, teacherName, periodId, className, weekday, startWeek, endWeek } ] }
 */
const importCourseSchedules = async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ msg: '导入数据为空' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i] || {};
      const requiredMissing = !item.classroomId || !item.courseName || !item.teacherName || !item.periodId || !item.className;
      if (requiredMissing) {
        throw new Error(`第 ${i + 1} 行缺少必填字段`);
      }

      const errorMsg = validateSchedule(item);
      if (errorMsg) {
        throw new Error(`第 ${i + 1} 行：${errorMsg}`);
      }

      await connection.query(
        `INSERT INTO ${TABLE_NAME}
         (classroom_id, course_name, teacher_id, teacher_name, period_id, class_name, weekday, start_week, end_week)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(item.classroomId),
          item.courseName,
          item.teacherId ? Number(item.teacherId) : null,
          item.teacherName,
          Number(item.periodId),
          item.className,
          Number(item.weekday),
          Number(item.startWeek),
          Number(item.endWeek)
        ]
      );
    }

    await connection.commit();
    res.json({ msg: '导入成功', count: items.length });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ msg: err.message || '导入失败' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getCourseSchedules,
  createCourseSchedule,
  updateCourseSchedule,
  deleteCourseSchedule,
  importCourseSchedules
};
