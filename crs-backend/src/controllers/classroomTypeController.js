/**
 * 教室类型管理控制器（数据库版）
 * 表结构：classroom_type
 * - type_id (int)   主键
 * - type_name (varchar)
 * - type_desc (varchar)
 */
const { pool } = require('../db/db')

// 数据库行 -> 前端对象
const mapRow = (row) => {
  return {
    id: row.type_id,
    typeName: row.type_name,
    description: row.type_desc || ''
  }
}

/**
 * 获取教室类型列表（支持分页/关键词）
 * query: keyword, page, pageSize
 */
const listClassroomTypes = async (req, res) => {
  const { keyword } = req.query
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 10)
  const offset = (page - 1) * pageSize

  try {
    const where = []
    const params = []
    if (keyword) {
      where.push('(type_name LIKE ? OR type_desc LIKE ?)')
      const key = `%${keyword}%`
      params.push(key, key)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM classroom_type ${whereSql}`,
      params
    )

    const [rows] = await pool.query(
      `SELECT type_id, type_name, type_desc
       FROM classroom_type
       ${whereSql}
       ORDER BY type_id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    res.json({
      data: rows.map(mapRow),
      pagination: { page, pageSize, total: countRow.total || 0 }
    })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

/**
 * 新增教室类型（管理员）
 */
const createClassroomType = async (req, res) => {
  const { typeName, description } = req.body || {}
  if (!typeName) {
    return res.status(400).json({ msg: '类型名称不能为空' })
  }

  try {
    const [exists] = await pool.query(
      'SELECT type_id FROM classroom_type WHERE type_name = ? LIMIT 1',
      [typeName]
    )
    if (exists.length) {
      return res.status(409).json({ msg: '类型名称已存在' })
    }

    const [result] = await pool.query(
      'INSERT INTO classroom_type (type_name, type_desc) VALUES (?, ?)',
      [typeName, description || '']
    )

    res.json({
      msg: '新增成功',
      data: {
        id: result.insertId,
        typeName,
        description: description || ''
      }
    })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

/**
 * 更新教室类型（管理员）
 */
const updateClassroomType = async (req, res) => {
  const { id } = req.params
  const { typeName, description } = req.body || {}

  if (typeName === undefined && description === undefined) {
    return res.status(400).json({ msg: '没有可更新的字段' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT type_id FROM classroom_type WHERE type_id = ? LIMIT 1',
      [id]
    )
    if (!rows.length) {
      return res.status(404).json({ msg: '教室类型不存在' })
    }

    if (typeName) {
      const [exists] = await pool.query(
        'SELECT type_id FROM classroom_type WHERE type_name = ? AND type_id <> ? LIMIT 1',
        [typeName, id]
      )
      if (exists.length) {
        return res.status(409).json({ msg: '类型名称已存在' })
      }
    }

    const fields = []
    const values = []
    if (typeName !== undefined) {
      fields.push('type_name = ?')
      values.push(typeName)
    }
    if (description !== undefined) {
      fields.push('type_desc = ?')
      values.push(description)
    }

    values.push(id)
    await pool.query(`UPDATE classroom_type SET ${fields.join(', ')} WHERE type_id = ?`, values)

    res.json({ msg: '更新成功' })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

/**
 * 删除教室类型（管理员）
 */
const deleteClassroomType = async (req, res) => {
  const { id } = req.params
  try {
    const [result] = await pool.query('DELETE FROM classroom_type WHERE type_id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: '教室类型不存在' })
    }
    res.json({ msg: '删除成功' })
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message })
  }
}

module.exports = {
  listClassroomTypes,
  createClassroomType,
  updateClassroomType,
  deleteClassroomType
}
