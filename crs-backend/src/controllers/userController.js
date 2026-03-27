const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

// ==================== 登录失败次数限制（内存级） ====================
// 说明：这里使用内存 Map 进行“临时锁定”，无需改表即可满足需求。
// 注意：服务重启后会清空计数；如需持久化可改为写库。
const FAILED_LOGIN_LIMIT = 3; // 第 3 次起触发锁定
const LOCK_DURATION_MS = 10 * 60 * 1000; // 临时锁定 10 分钟
const loginAttemptMap = new Map();

const getAttemptInfo = (username) => {
  if (!username) return { count: 0, lockedUntil: 0 };
  const info = loginAttemptMap.get(username) || { count: 0, lockedUntil: 0 };

  // 如果锁定时间已过，自动清零
  if (info.lockedUntil && Date.now() >= info.lockedUntil) {
    loginAttemptMap.delete(username);
    return { count: 0, lockedUntil: 0 };
  }

  return info;
};

const recordFailedAttempt = (username) => {
  const info = getAttemptInfo(username);
  const nextCount = info.count + 1;
  const nextInfo = { count: nextCount, lockedUntil: info.lockedUntil };

  // 第 3 次及以上直接锁定
  if (nextCount >= FAILED_LOGIN_LIMIT) {
    nextInfo.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }

  loginAttemptMap.set(username, nextInfo);
  return nextInfo;
};

const clearAttempts = (username) => {
  if (username) loginAttemptMap.delete(username);
};

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

// 可空字段统一：空字符串按 null 入库，避免外键/约束异常
const normalizeNullable = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

let userColumnSetCache = null;

const getUserColumnSet = async () => {
  if (userColumnSetCache) return userColumnSetCache;
  const [rows] = await pool.query('SHOW COLUMNS FROM user');
  userColumnSetCache = new Set(rows.map(row => row.Field));
  return userColumnSetCache;
};

/**
 * 用户登录
 * @param {*} req 
 * @param {*} res 
 */
// 用户登录
exports.login = async (req, res) => {
  const { username, password } = req.body;
  // A-3：账号为空提示
  if (!username) {
    return res.status(400).json({ msg: '请输入学号/工号' });
  }
  // A-4：密码为空提示
  if (!password) {
    return res.status(400).json({ msg: '请输入密码' });
  }

  // A-7：如果账号已被临时锁定，直接提示并阻止登录
  const attemptInfo = getAttemptInfo(username);
  if (attemptInfo.lockedUntil && Date.now() < attemptInfo.lockedUntil) {
    return res.status(429).json({ msg: '密码错误次数过多，请稍后重试' });
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
      // A-3：账号未注册
      return res.status(401).json({ msg: '该账号错误' });
    }
    const user = rows[0];
    if (user.password !== password) {
      // A-7：密码错误次数记录与提示
      const nextInfo = recordFailedAttempt(username);
      if (nextInfo.lockedUntil && Date.now() < nextInfo.lockedUntil) {
        return res.status(429).json({ msg: '密码错误次数过多，请稍后重试' });
      }
      return res.status(401).json({ msg: '密码错误，请重新输入' });
    }

    // 登录成功，清除失败计数
    clearAttempts(username);
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
    const userColumns = await getUserColumnSet();

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
      const keywordColumns = ['username', 'real_name', 'phone', 'email', 'student_no', 'job_no']
        .filter(col => userColumns.has(col));

      if (keywordColumns.length) {
        whereClauses.push(`(${keywordColumns.map(col => `u.${col} LIKE ?`).join(' OR ')})`);
        const like = `%${keyword}%`;
        keywordColumns.forEach(() => params.push(like));
      }
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
 * 管理员：获取院系列表（用于下拉框）
 */
exports.adminListDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT dept_code, dept_name
       FROM department_dict
       WHERE is_active = 1
       ORDER BY sort_order ASC, dept_id ASC`
    );

    res.json({
      data: rows.map(row => ({
        code: row.dept_code,
        name: row.dept_name
      }))
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

    const userColumns = await getUserColumnSet();
    const insertColumns = ['username', 'password', 'role'];
    const insertValues = [username, password, role];

    if (userColumns.has('real_name')) {
      insertColumns.push('real_name');
      insertValues.push(normalizeNullable(realName));
    }
    if (userColumns.has('phone')) {
      insertColumns.push('phone');
      insertValues.push(normalizeNullable(phone));
    }
    if (userColumns.has('email')) {
      insertColumns.push('email');
      insertValues.push(normalizeNullable(email));
    }
    if (userColumns.has('department')) {
      insertColumns.push('department');
      insertValues.push(normalizeNullable(department));
    }
    if (userColumns.has('student_no')) {
      insertColumns.push('student_no');
      insertValues.push(normalizeNullable(studentNo));
    }
    if (userColumns.has('job_no')) {
      insertColumns.push('job_no');
      insertValues.push(normalizeNullable(jobNo));
    }
    if (userColumns.has('avatar')) {
      insertColumns.push('avatar');
      insertValues.push(normalizeNullable(avatar));
    }

    const [result] = await pool.query(
      `INSERT INTO user (${insertColumns.join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      insertValues
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

    const userColumns = await getUserColumnSet();

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

    const normalizedPhone = normalizeNullable(phone);
    const normalizedEmail = normalizeNullable(email);
    const normalizedDepartment = normalizeNullable(department);
    const normalizedStudentNo = normalizeNullable(studentNo);
    const normalizedJobNo = normalizeNullable(jobNo);
    const normalizedAvatar = normalizeNullable(avatar);

    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username);
    }
    if (realName !== undefined) {
      fields.push('real_name = ?');
      values.push(realName);
    }
    if (phone !== undefined) {
      if (userColumns.has('phone')) {
        fields.push('phone = ?');
        values.push(normalizedPhone);
      }
    }
    if (email !== undefined) {
      if (userColumns.has('email')) {
        fields.push('email = ?');
        values.push(normalizedEmail);
      }
    }
    if (department !== undefined) {
      if (userColumns.has('department')) {
        fields.push('department = ?');
        values.push(normalizedDepartment);
      }
    }
    if (studentNo !== undefined) {
      if (userColumns.has('student_no')) {
        fields.push('student_no = ?');
        values.push(normalizedStudentNo);
      }
    }
    if (jobNo !== undefined) {
      if (userColumns.has('job_no')) {
        fields.push('job_no = ?');
        values.push(normalizedJobNo);
      }
    }
    if (avatar !== undefined) {
      if (userColumns.has('avatar')) {
        fields.push('avatar = ?');
        values.push(normalizedAvatar);
      }
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
    if (err.code === 'ER_NO_REFERENCED_ROW_2' && String(err.message).includes('department')) {
      return res.status(400).json({ msg: '院系编码不存在，请填写有效的院系编码' });
    }
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(400).json({ msg: '数据库字段与代码不匹配，请检查 user 表字段配置' });
    }
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

