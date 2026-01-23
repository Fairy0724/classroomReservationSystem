const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

/**
 * JWT 鉴权中间件
 * - 从 Authorization: Bearer <token> 读取 token
 * - 解码后把用户信息放到 req.user
 */
module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  // 从 Authorization: Bearer <token> 中提取 token
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ msg: '未登录或登录已过期' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ msg: '登录已过期，请重新登录' });
  }
};
