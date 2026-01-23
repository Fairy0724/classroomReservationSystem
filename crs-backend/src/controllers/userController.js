const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

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

