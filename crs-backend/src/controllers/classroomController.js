// 教室控制器（数据库版）
const { pool } = require('../db/db')

// 注意：当教室状态更新为“维护中”时，需要自动发布系统公告。
// 这些工具函数用于保持逻辑集中且易读。

// 检查公告表是否存在，避免表缺失导致请求直接失败。
const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  )
  return rows.length > 0
}

// 统一状态文本格式，避免空格等问题导致判断失误。
const normalizeStatus = (value) => String(value || '').trim()

// 判断是否需要触发“维护中”公告。
const shouldPublishMaintenanceAnnouncement = (beforeStatus, afterStatus) => {
  const before = normalizeStatus(beforeStatus)
  const after = normalizeStatus(afterStatus)
  return before !== after && after === '维护中'
}

// 解析 JSON 数组字段
const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

// 兼容设备字段（set/逗号字符串/数组）
const normalizeEquipment = (value) => {
  if (Array.isArray(value)) return value.join(',')
  return value || ''
}

// 校验并解析教室类型（外键：classroom.type -> classroom_type.type_id）
const resolveClassroomTypeId = async (input) => {
  if (input === undefined || input === null || input === '') {
    return { ok: false, msg: '教室类型不能为空' }
  }

  const typeId = Number(input)
  if (!Number.isInteger(typeId) || typeId <= 0) {
    return { ok: false, msg: '教室类型必须为有效的类型ID' }
  }

  const [rows] = await pool.query(
    'SELECT type_id FROM classroom_type WHERE type_id = ? LIMIT 1',
    [typeId]
  )

  if (!rows.length) {
    return { ok: false, msg: '教室类型不存在' }
  }

  return { ok: true, typeId }
}

// 数据库行 -> 前端对象
const mapRow = (row) => {
  return {
    classroomId: row.classroom_id,
    building: row.building,
    floor: row.floor,
    roomNum: row.room_num,
    deptName: row.dept_name,
    capacity: row.capacity,
    equipment: row.equipment,
    typeId: row.type,
    type: row.type_name || '',
    status: row.status,
    createTime: row.create_time,
    updateTime: row.update_time,
    mainImage: row.main_image,
    extraImages: parseJsonArray(row.extra_images)
  }
}

// 统一处理数组字段（支持数组或 JSON 字符串）
const normalizeArray = (value, fallback = []) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : fallback
      } catch (err) {
        return fallback
      }
    }
  }
  return fallback
}

/**
 * 获取教室列表或单个教室
 * 支持：
 * - id：返回单个教室
 * - keyword：按名称/位置模糊筛选
 */
const getClassrooms = async (req, res) => {
  const { id, keyword } = req.query

  try {
    if (id) {
      const [rows] = await pool.query(
        `SELECT c.*, ct.type_name
         FROM classroom c
         LEFT JOIN classroom_type ct ON c.type = ct.type_id
         WHERE c.classroom_id = ?`,
        [id]
      )
      if (!rows.length) {
        return res.status(404).json({ msg: '教室不存在' })
      }
      return res.json([mapRow(rows[0])])
    }

    let sql = `SELECT c.*, ct.type_name
               FROM classroom c
               LEFT JOIN classroom_type ct ON c.type = ct.type_id`
    const params = []
    if (keyword) {
      sql += ' WHERE c.building LIKE ? OR c.room_num LIKE ? OR c.dept_name LIKE ? OR ct.type_name LIKE ? OR c.status LIKE ?'
      const key = `%${keyword}%`
      params.push(key, key, key, key, key)
    }

    const [rows] = await pool.query(sql, params)
    res.json(rows.map(mapRow))
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

/**
 * 获取教室负责教师（从 teacher_classroom_relation 关联 teacher 表）
 * 返回：{ teacherId, teacherName }
 */
const getResponsibleTeacher = async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ msg: '缺少教室ID' })
  }

  try {
    const hasRelation = await tableExists('teacher_classroom_relation')
    if (!hasRelation) {
      return res.json({ teacherId: null, teacherName: null })
    }

    const hasTeacher = await tableExists('teacher')
    if (!hasTeacher) {
      const [rows] = await pool.query(
        'SELECT teacher_id FROM teacher_classroom_relation WHERE classroom_id = ? ORDER BY id ASC LIMIT 1',
        [id]
      )
      const teacherId = rows.length ? rows[0].teacher_id : null
      return res.json({ teacherId, teacherName: null })
    }

    const [rows] = await pool.query(
      `SELECT tcr.teacher_id, t.name
       FROM teacher_classroom_relation tcr
       LEFT JOIN teacher t ON t.teacher_id = tcr.teacher_id
       WHERE tcr.classroom_id = ?
       ORDER BY tcr.id ASC
       LIMIT 1`,
      [id]
    )

    if (!rows.length) {
      return res.json({ teacherId: null, teacherName: null })
    }

    return res.json({
      teacherId: rows[0].teacher_id ?? null,
      teacherName: rows[0].name ?? null
    })
  } catch (err) {
    return res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

// 新增教室（管理员）
const createClassroom = async (req, res) => {
  try {
    const {
      building,
      floor,
      roomNum,
      deptName,
      capacity,
      equipment,
      type,
      status,
      mainImage,
      extraImages
    } = req.body || {}

    if (!building || !roomNum || !deptName || !capacity || !type) {
      return res.status(400).json({ msg: '楼号/教室编号/所属学院/容量/类型为必填项' })
    }

    const typeResolved = await resolveClassroomTypeId(type)
    if (!typeResolved.ok) {
      return res.status(400).json({ msg: typeResolved.msg })
    }

    const extraImagesText = JSON.stringify(parseJsonArray(extraImages))

    await pool.query(
      `INSERT INTO classroom
      (building, floor, room_num, dept_name, capacity, equipment, type, status, main_image, extra_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        building,
        Number(floor || 1),
        roomNum,
        deptName,
        Number(capacity),
        normalizeEquipment(equipment),
        typeResolved.typeId,
        status || '可用',
        mainImage || '',
        extraImagesText
      ]
    )

    res.json({ msg: '新增成功' })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

// 更新教室（管理员）
const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params
    const payload = req.body || {}

    // 如果这次更新包含状态字段，先读取当前状态和位置。
    // 这样才能判断是否需要发布维护公告。
    let prevStatus = null
    let classroomLabel = ''
    if (payload.status !== undefined) {
      const [rows] = await pool.query(
        'SELECT status, building, room_num FROM classroom WHERE classroom_id = ?',
        [id]
      )

      if (!rows.length) {
        return res.status(404).json({ msg: '教室不存在' })
      }

      prevStatus = rows[0].status
      const building = rows[0].building || ''
      const roomNum = rows[0].room_num || ''
      classroomLabel = `${building}${roomNum ? '-' + roomNum : ''}`.trim()
    }

    const fields = []
    const values = []

    if (payload.building !== undefined) {
      fields.push('building = ?')
      values.push(payload.building)
    }
    if (payload.floor !== undefined) {
      fields.push('floor = ?')
      values.push(Number(payload.floor))
    }
    if (payload.roomNum !== undefined) {
      fields.push('room_num = ?')
      values.push(payload.roomNum)
    }
    if (payload.deptName !== undefined) {
      fields.push('dept_name = ?')
      values.push(payload.deptName)
    }
    if (payload.capacity !== undefined) {
      fields.push('capacity = ?')
      values.push(Number(payload.capacity))
    }
    if (payload.equipment !== undefined) {
      fields.push('equipment = ?')
      values.push(normalizeEquipment(payload.equipment))
    }
    if (payload.type !== undefined) {
      const typeResolved = await resolveClassroomTypeId(payload.type)
      if (!typeResolved.ok) {
        return res.status(400).json({ msg: typeResolved.msg })
      }
      fields.push('type = ?')
      values.push(typeResolved.typeId)
    }
    if (payload.status !== undefined) {
      fields.push('status = ?')
      values.push(payload.status)
    }
    if (payload.mainImage !== undefined) {
      fields.push('main_image = ?')
      values.push(payload.mainImage)
    }
    if (payload.extraImages !== undefined) {
      fields.push('extra_images = ?')
      values.push(JSON.stringify(parseJsonArray(payload.extraImages)))
    }

    if (!fields.length) {
      return res.status(400).json({ msg: '没有可更新的字段' })
    }

    values.push(id)
    await pool.query(`UPDATE classroom SET ${fields.join(', ')} WHERE classroom_id = ?`, values)

    // 只有当状态变更为“维护中”时才发布系统公告。
    if (payload.status !== undefined && shouldPublishMaintenanceAnnouncement(prevStatus, payload.status)) {
      const adminId = req.user?.user_id
      const hasAnnouncementTable = await tableExists('system_announcement')

      if (adminId && hasAnnouncementTable) {
        const title = '教室维护通知'
        const content = classroomLabel
          ? `教室 ${classroomLabel} 已调整为维护中状态，暂停预约。`
          : '教室已调整为维护中状态，暂停预约。'

        // 1) 写入系统公告表，供公告列表展示。
        await pool.query(
          `INSERT INTO system_announcement
           (admin_id, title, content, publish_time, expire_time, is_top, is_active, view_count)
           VALUES (?, ?, ?, NOW(), NULL, 0, 1, 0)`,
          [adminId, title, content]
        )

        // 2) 给所有教师/学生写入系统通知消息。
        try {
          const [users] = await pool.query(
            `SELECT user_id FROM user WHERE role IN ('student','teacher')`
          )

          if (users.length) {
            const values = users.map(row => [
              row.user_id,
              'system_notice',
              title,
              content,
              new Date(),
              0
            ])

            await pool.query(
              'INSERT INTO message (user_id, type, title, content, send_time, is_read) VALUES ?',
              [values]
            )
          }
        } catch (err) {
          // 通知写入失败不影响教室更新流程。
          console.warn('maintenance notice insert failed:', err.message)
        }
      }
    }

    res.json({ msg: '更新成功' })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

// 删除教室（管理员）
const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM classroom WHERE classroom_id = ?', [id])
    res.json({ msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

module.exports = {
  getClassrooms,
  getResponsibleTeacher,
  createClassroom,
  updateClassroom,
  deleteClassroom
}
