const { pool } = require('../db/db');

const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows.length > 0;
};

const normalizeIsRead = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true' || value === 1 || value === '1') return 1;
  if (value === false || value === 'false' || value === 0 || value === '0') return 0;
  return null;
};

const normalizeSendTime = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const createMessage = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const { userId, type, title, content, sendTime } = req.body || {};
    if (!userId || !type || !title || !content) {
      return res.status(400).json({ msg: '参数不完整' });
    }

    const normalizedTime = normalizeSendTime(sendTime);
    if (!normalizedTime) {
      return res.status(400).json({ msg: '发送时间格式不正确' });
    }

    const [result] = await pool.query(
      `INSERT INTO message (user_id, type, title, content, send_time, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, type, title, content, normalizedTime]
    );

    res.json({ msg: '消息写入成功', messageId: result.insertId });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const batchCreateMessages = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ msg: 'messages 不能为空' });
    }

    const values = [];
    for (const item of messages) {
      const { userId, type, title, content, sendTime } = item || {};
      if (!userId || !type || !title || !content) {
        return res.status(400).json({ msg: 'messages 中存在参数不完整的记录' });
      }
      const normalizedTime = normalizeSendTime(sendTime);
      if (!normalizedTime) {
        return res.status(400).json({ msg: 'messages 中存在发送时间格式不正确的记录' });
      }
      values.push([userId, type, title, content, normalizedTime, 0]);
    }

    const [result] = await pool.query(
      'INSERT INTO message (user_id, type, title, content, send_time, is_read) VALUES ?',
      [values]
    );

    res.json({ msg: '批量写入成功', inserted: result.affectedRows || 0 });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const listMessages = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const { type, isRead, page = 1, limit = 20 } = req.query || {};
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const where = ['user_id = ?'];
    const params = [userId];

    if (type) {
      where.push('type = ?');
      params.push(type);
    }

    const normalizedRead = normalizeIsRead(isRead);
    if (normalizedRead !== null) {
      where.push('is_read = ?');
      params.push(normalizedRead);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM message ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT message_id, user_id, type, title, content, send_time, is_read
       FROM message ${whereSql}
       ORDER BY send_time DESC, message_id DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    res.json({
      data: rows,
      page: safePage,
      limit: safeLimit,
      total: countRow?.total || 0
    });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const getMessageDetail = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT message_id, user_id, type, title, content, send_time, is_read
       FROM message
       WHERE message_id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ msg: '消息不存在' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS unreadCount FROM message WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    res.json({ unreadCount: row?.unreadCount || 0 });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const markAsRead = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const { id } = req.params;
    const [result] = await pool.query(
      'UPDATE message SET is_read = 1 WHERE message_id = ? AND user_id = ?',
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ msg: '消息不存在或无权限' });
    }

    res.json({ msg: '标记成功' });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const batchRead = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const { messageIds } = req.body || {};

    if (!Array.isArray(messageIds) || !messageIds.length) {
      return res.status(400).json({ msg: 'messageIds 不能为空' });
    }

    const [result] = await pool.query(
      'UPDATE message SET is_read = 1 WHERE user_id = ? AND message_id IN (?)',
      [userId, messageIds]
    );

    res.json({ msg: '标记成功', updated: result.affectedRows || 0 });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const markAllRead = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const [result] = await pool.query(
      'UPDATE message SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ msg: '标记成功', updated: result.affectedRows || 0 });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const hasTable = await tableExists('message');
    if (!hasTable) {
      return res.status(400).json({ msg: '消息表 message 不存在' });
    }

    const userId = req.user.user_id;
    const { id } = req.params;
    const [result] = await pool.query(
      'DELETE FROM message WHERE message_id = ? AND user_id = ?',
      [id, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ msg: '消息不存在或无权限' });
    }

    res.json({ msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ msg: `系统服务异常：${err.message}` });
  }
};

module.exports = {
  createMessage,
  batchCreateMessages,
  listMessages,
  getMessageDetail,
  getUnreadCount,
  markAsRead,
  batchRead,
  markAllRead,
  deleteMessage
};
