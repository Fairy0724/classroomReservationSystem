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
    const [rows] = await pool.query('SELECT * FROM user WHERE username = ?', [username]);
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
    const { password: _, ...userInfo } = user;
    res.json({ token, user: userInfo });
  } catch (err) {
    res.status(500).json({ msg: '服务器错误', error: err.message });
  }
};
