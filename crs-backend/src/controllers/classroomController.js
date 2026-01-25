// 教室控制器（数据库版）
const { pool } = require('../db/db')

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
    type: row.type,
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
        'SELECT * FROM classroom WHERE classroom_id = ?',
        [id]
      )
      if (!rows.length) {
        return res.status(404).json({ msg: '教室不存在' })
      }
      return res.json([mapRow(rows[0])])
    }

    let sql = 'SELECT * FROM classroom'
    const params = []
    if (keyword) {
      sql += ' WHERE building LIKE ? OR room_num LIKE ? OR dept_name LIKE ? OR type LIKE ? OR status LIKE ?'
      const key = `%${keyword}%`
      params.push(key, key, key, key, key)
    }

    const [rows] = await pool.query(sql, params)
    res.json(rows.map(mapRow))
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
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
        type,
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
      fields.push('type = ?')
      values.push(payload.type)
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
  createClassroom,
  updateClassroom,
  deleteClassroom
}
