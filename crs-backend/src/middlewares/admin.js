/**
 * 管理员权限校验
 * 依赖 auth 中间件已解析 req.user
 */
module.exports = function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ msg: '无管理员权限' });
  }
  next();
};
