const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

// ==================== 管理员用户管理工具函数 ====================
// 将数据库字段映射为前端可读字段（避免直接暴露密码）
const mapUserRow = (row) => {
  if (!row) return row;
  return {
    userId: row.user_id,
    username: row.username,
    role: row.role,
    realName: row.real_name,
    phone: row.phone,
    email: row.email,
    avatar: row.avatar,
    departmentCode: row.department,
    departmentName: row.department_name || null,
    studentNo: row.student_no,
    jobNo: row.job_no,
    createTime: row.create_time
  };
};

// 允许的用户角色（用于管理员用户管理）
const ADMIN_ALLOWED_ROLES = ['teacher', 'student'];

/**
 * 用户登录
 * @param {*} req 
 * @param {*} res 
 */
// 用户登录
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: '用户名和密码不能为空' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.username = ?`,
      [username]
    );
    if (!rows.length) {
      return res.status(401).json({ msg: '用户不存在' });
    }
    const user = rows[0];
    if (user.password !== password) {
      return res.status(401).json({ msg: '密码错误' });
    }
    // 生成token
    const token = jwt.sign({ user_id: user.user_id, username: user.username, role: user.role }, jwtSecret, { expiresIn: '2h' });
    // 返回用户信息（去除密码）
    const { password: _, department_name, ...userInfo } = user;
    // 兼容前端：返回可读部门名称
    userInfo.department = department_name || userInfo.department || null;
    res.json({ token, user: userInfo });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

// 获取个人信息
exports.getUserInfo = async (req, res) => {
  try {
    // 从请求中获取用户ID（从token中解析）
    const userId = req.user.user_id;
    // 查询用户信息 从数据库中获取用户所有信息
    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.user_id = ?`,
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }
    // 提取用户信息
    const user = rows[0];
    // console.log(user);
    // 去除密码字段
    const { password: _, department_name, ...userInfo } = user;
    userInfo.department = department_name || userInfo.department || null;
    // 返回用户信息
    res.json({ user: userInfo });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
}

// 更新个人信息
exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      username,
      realName,
      phone,
      email,
      department,
      avatar
    } = req.body;

    // 允许更新的字段（与数据库字段映射）
    const fields = [];
    const values = [];

    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username);
    }
    if (realName !== undefined) {
      fields.push('real_name = ?');
      values.push(realName);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }
    if (department !== undefined) {
      fields.push('department = ?');
      values.push(department);
    }
    if (avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(avatar);
    }

    if (fields.length === 0) {
      return res.status(400).json({ msg: '没有可更新的字段' });
    }

    values.push(userId);
    await pool.query(`UPDATE user SET ${fields.join(', ')} WHERE user_id = ?`, values);

    // 返回更新后的用户信息
    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.user_id = ?`,
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }
    const user = rows[0];
    const { password: _, department_name, ...userInfo } = user;
    userInfo.department = department_name || userInfo.department || null;
    res.json({ user: userInfo });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { oldPwd, newPwd } = req.body;
    if (!oldPwd || !newPwd) {
      return res.status(400).json({ msg: '原密码和新密码不能为空' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.user_id = ?`,
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }
    const user = rows[0];
    if (user.password !== oldPwd) {
      return res.status(400).json({ msg: '原密码错误' });
    }
    if (oldPwd === newPwd) {
      return res.status(400).json({ msg: '新密码不能与原密码相同' });
    }

    await pool.query('UPDATE user SET password = ? WHERE user_id = ?', [newPwd, userId]);
    res.json({ msg: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

// 修改手机号
exports.updatePhone = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { newPhone } = req.body;
    if (!newPhone) {
      return res.status(400).json({ msg: '手机号不能为空' });
    }

    await pool.query('UPDATE user SET phone = ? WHERE user_id = ?', [newPhone, userId]);

    const [rows] = await pool.query('SELECT * FROM user WHERE user_id = ?', [userId]);
    const user = rows[0];
    const { password: _, department_name, ...userInfo } = user;
    userInfo.department = department_name || userInfo.department || null;
    res.json({ user: userInfo });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

// ==================== 管理员用户管理接口 ====================

/**
 * 管理员：获取用户列表（支持教师/学生）
 * query: role=teacher|student, keyword, page, pageSize
 */
exports.adminListUsers = async (req, res) => {
  try {
    const { role, keyword } = req.query;
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);

    if (role && !ADMIN_ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ msg: '角色参数错误' });
    }

    // 动态拼接查询条件
    const whereClauses = ['1=1'];
    const params = [];

    if (role) {
      whereClauses.push('u.role = ?');
      params.push(role);
    }

    if (keyword) {
      whereClauses.push(`(
        u.username LIKE ? OR
        u.real_name LIKE ? OR
        u.phone LIKE ? OR
        u.email LIKE ? OR
        u.student_no LIKE ? OR
        u.job_no LIKE ?
      )`);
      const like = `%${keyword}%`;
      params.push(like, like, like, like, like, like);
    }

    // 总数统计
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM user u WHERE ${whereClauses.join(' AND ')}`,
      params
    );

    const total = countRows[0]?.total || 0;
    const offset = (page - 1) * pageSize;

    // 列表查询（补充部门名称）
    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY u.user_id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      data: rows.map(mapUserRow),
      pagination: { page, pageSize, total }
    });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 管理员：创建用户（教师/学生）
 */
exports.adminCreateUser = async (req, res) => {
  try {
    const {
      username,
      password,
      role,
      realName,
      phone,
      email,
      department,
      studentNo,
      jobNo,
      avatar
    } = req.body || {};

    if (!username || !password || !role) {
      return res.status(400).json({ msg: '用户名、密码、角色为必填项' });
    }
    if (!ADMIN_ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ msg: '角色不允许' });
    }

    // 检查用户名是否已存在
    const [exists] = await pool.query('SELECT user_id FROM user WHERE username = ?', [username]);
    if (exists.length) {
      return res.status(409).json({ msg: '用户名已存在' });
    }

    const [result] = await pool.query(
      `INSERT INTO user
        (username, password, role, real_name, phone, email, department, student_no, job_no, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        username,
        password,
        role,
        realName || null,
        phone || null,
        email || null,
        department || null,
        studentNo || null,
        jobNo || null,
        avatar || null
      ]
    );

    const [rows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.user_id = ?`,
      [result.insertId]
    );

    res.json({ msg: '创建成功', data: mapUserRow(rows[0]) });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 管理员：更新用户（教师/学生）
 */
exports.adminUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      realName,
      phone,
      email,
      department,
      studentNo,
      jobNo,
      avatar
    } = req.body || {};

    const [rows] = await pool.query('SELECT * FROM user WHERE user_id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    // 不允许修改管理员账号
    if (rows[0].role === 'admin') {
      return res.status(400).json({ msg: '不允许修改管理员账号' });
    }

    // 若用户名变更则校验唯一性
    if (username && username !== rows[0].username) {
      const [exists] = await pool.query('SELECT user_id FROM user WHERE username = ?', [username]);
      if (exists.length) {
        return res.status(409).json({ msg: '用户名已存在' });
      }
    }

    const fields = [];
    const values = [];

    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username);
    }
    if (realName !== undefined) {
      fields.push('real_name = ?');
      values.push(realName);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }
    if (department !== undefined) {
      fields.push('department = ?');
      values.push(department);
    }
    if (studentNo !== undefined) {
      fields.push('student_no = ?');
      values.push(studentNo);
    }
    if (jobNo !== undefined) {
      fields.push('job_no = ?');
      values.push(jobNo);
    }
    if (avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(avatar);
    }

    if (!fields.length) {
      return res.status(400).json({ msg: '没有可更新的字段' });
    }

    values.push(id);
    await pool.query(`UPDATE user SET ${fields.join(', ')} WHERE user_id = ?`, values);

    const [updatedRows] = await pool.query(
      `SELECT u.*, d.dept_name AS department_name
       FROM user u
       LEFT JOIN department_dict d ON u.department = d.dept_code
       WHERE u.user_id = ?`,
      [id]
    );

    res.json({ msg: '更新成功', data: mapUserRow(updatedRows[0]) });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 管理员：删除用户（教师/学生）
 */
exports.adminDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT role FROM user WHERE user_id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    if (rows[0].role === 'admin') {
      return res.status(400).json({ msg: '不允许删除管理员账号' });
    }

    await pool.query('DELETE FROM user WHERE user_id = ?', [id]);
    res.json({ msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

/**
 * 管理员：重置用户密码（默认 123456，可传 newPassword）
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    const password = newPassword || '123456';

    const [rows] = await pool.query('SELECT role FROM user WHERE user_id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    if (rows[0].role === 'admin') {
      return res.status(400).json({ msg: '不允许重置管理员密码' });
    }

    await pool.query('UPDATE user SET password = ? WHERE user_id = ?', [password, id]);
    res.json({ msg: '密码已重置', data: { userId: id, password } });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};

