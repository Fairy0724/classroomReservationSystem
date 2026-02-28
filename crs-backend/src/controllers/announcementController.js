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

const normalizeTinyInt = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value) ? 1 : 0;
};

const normalizeExpireTime = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

// 公告列表（用户侧，过滤未下架/未过期，支持关键词）
const listPublicAnnouncements = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const { keyword } = req.query || {};
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 50);
    const offset = (page - 1) * pageSize;

    const where = ['is_active = 1', '(expire_time IS NULL OR expire_time > NOW())'];
    const params = [];

    if (keyword) {
      where.push('(title LIKE ? OR content LIKE ?)');
      const key = `%${keyword}%`;
      params.push(key, key);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM system_announcement WHERE ${where.join(' AND ')}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT announcement_id, admin_id, title, content, publish_time, expire_time, is_top, is_active, view_count
       FROM system_announcement
       WHERE ${where.join(' AND ')}
       ORDER BY is_top DESC, publish_time DESC, announcement_id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows,
      pagination: { page, pageSize, total: countRow?.total || 0 }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

// 公告详情（用户侧，过滤未下架/未过期，浏览量 +1）
const getPublicAnnouncementDetail = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT announcement_id, admin_id, title, content, publish_time, expire_time, is_top, is_active, view_count
       FROM system_announcement
       WHERE announcement_id = ? AND is_active = 1 AND (expire_time IS NULL OR expire_time > NOW())
       LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ msg: '公告不存在或已下架' });
    }

    const detail = rows[0];

    await pool.query(
      'UPDATE system_announcement SET view_count = view_count + 1 WHERE announcement_id = ?',
      [id]
    );

    res.json({
      data: {
        ...detail,
        view_count: Number(detail.view_count || 0) + 1
      }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

// 管理员列表（支持筛选/分页）
const listAdminAnnouncements = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const { keyword, isActive, isTop } = req.query || {};
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 50);
    const offset = (page - 1) * pageSize;

    const where = ['1=1'];
    const params = [];

    if (keyword) {
      where.push('(title LIKE ? OR content LIKE ?)');
      const key = `%${keyword}%`;
      params.push(key, key);
    }

    if (isActive !== undefined && isActive !== '') {
      where.push('is_active = ?');
      params.push(Number(isActive) ? 1 : 0);
    }

    if (isTop !== undefined && isTop !== '') {
      where.push('is_top = ?');
      params.push(Number(isTop) ? 1 : 0);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM system_announcement WHERE ${where.join(' AND ')}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT announcement_id, admin_id, title, content, publish_time, expire_time, is_top, is_active, view_count
       FROM system_announcement
       WHERE ${where.join(' AND ')}
       ORDER BY is_top DESC, publish_time DESC, announcement_id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows,
      pagination: { page, pageSize, total: countRow?.total || 0 }
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

// 管理员新增公告（并向用户发送系统通知）
const createAnnouncement = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const adminId = req.user?.user_id;
    const { title, content, expireTime, isTop, isActive } = req.body || {};

    if (!adminId || !title || !content) {
      return res.status(400).json({ msg: '参数不完整' });
    }

    const normalizedExpire = normalizeExpireTime(expireTime);
    const topValue = normalizeTinyInt(isTop, 0);
    const activeValue = normalizeTinyInt(isActive, 1);

    const [result] = await pool.query(
      `INSERT INTO system_announcement
       (admin_id, title, content, publish_time, expire_time, is_top, is_active, view_count)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, 0)`,
      [adminId, title, content, normalizedExpire, topValue, activeValue]
    );

    // 发布公告后，向所有非管理员用户写入系统通知
    try {
      const [users] = await pool.query(
        `SELECT user_id FROM user WHERE role IN ('student','teacher')`
      );

      if (users.length) {
        const values = users.map(row => [
          row.user_id,
          'system_notice',
          '系统公告通知',
          `【${title}】${content}`,
          new Date(),
          0
        ]);

        await pool.query(
          'INSERT INTO message (user_id, type, title, content, send_time, is_read) VALUES ?',
          [values]
        );
      }
    } catch (err) {
      // 通知写入失败不影响公告创建
      console.warn('system notice insert failed:', err.message);
    }

    res.json({ msg: '公告发布成功', announcementId: result.insertId });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

// 管理员更新公告
const updateAnnouncement = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const { id } = req.params;
    const { title, content, expireTime, isTop, isActive } = req.body || {};

    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
    }
    if (expireTime !== undefined) {
      fields.push('expire_time = ?');
      values.push(normalizeExpireTime(expireTime));
    }
    if (isTop !== undefined) {
      fields.push('is_top = ?');
      values.push(normalizeTinyInt(isTop, 0));
    }
    if (isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(normalizeTinyInt(isActive, 1));
    }

    if (!fields.length) {
      return res.status(400).json({ msg: '没有可更新的字段' });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE system_announcement SET ${fields.join(', ')} WHERE announcement_id = ?`,
      values
    );

    if (!result.affectedRows) {
      return res.status(404).json({ msg: '公告不存在' });
    }

    // 公告更新后再次通知用户
    try {
      const [users] = await pool.query(
        `SELECT user_id FROM user WHERE role IN ('student','teacher')`
      );

      if (users.length) {
        const values = users.map(row => [
          row.user_id,
          'system_notice',
          '系统公告更新通知',
          `【${title || '系统公告'}】公告内容已更新，请及时查看。`,
          new Date(),
          0
        ]);

        await pool.query(
          'INSERT INTO message (user_id, type, title, content, send_time, is_read) VALUES ?',
          [values]
        );
      }
    } catch (err) {
      // 通知写入失败不影响公告更新
      console.warn('system notice update insert failed:', err.message);
    }

    res.json({ msg: '公告更新成功' });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

// 管理员删除公告
const deleteAnnouncement = async (req, res) => {
  try {
    const hasTable = await tableExists('system_announcement');
    if (!hasTable) {
      return res.status(400).json({ msg: '系统公告表 system_announcement 不存在' });
    }

    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM system_announcement WHERE announcement_id = ?',
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ msg: '公告不存在' });
    }

    res.json({ msg: '公告删除成功' });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

module.exports = {
  listPublicAnnouncements,
  getPublicAnnouncementDetail,
  listAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
