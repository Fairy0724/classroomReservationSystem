const db = require("../db/db");

// 配置文件
module.exports = {
  dbHost: '127.0.0.1',
  dbPort: 3306,
  dbName: 'classroom_reservation',
  // jwt密钥
  jwtSecret: 'lovexy',
}