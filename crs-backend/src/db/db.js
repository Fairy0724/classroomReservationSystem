/**
 * MySQL数据库连接模块（基于mysql2连接池）
 * @param {Function} success 连接成功回调函数
 * @param {Function} error 连接失败回调函数（可选）
 */
module.exports = function (success, error) {
  // 处理error回调默认值，保持原逻辑一致
  if (typeof error !== 'function') {
    error = () => {
      console.log('数据库连接失败');
    };
  }

  // 1. 引入mysql2模块（项目已安装，无需额外安装）
  const mysql = require('mysql2/promise');
  // 2. 从配置文件获取MySQL连接参数（需确保配置文件包含这些字段）
  const { dbHost, dbPort, dbUser, dbPassword, dbName } = require('../config/config');

  // 3. 创建MySQL连接池（推荐方式，提升并发处理能力）
  const pool = mysql.createPool({
    host: dbHost,        // 数据库主机（如localhost）
    port: dbPort,        // 数据库端口（默认3306）
    user: dbUser,        // 数据库用户名（如root）
    password: dbPassword,// 数据库密码
    database: dbName,    // 数据库名（如classroom_reservation）
    connectionLimit: 10, // 连接池最大连接数
    waitForConnections: true // 无连接时等待（避免报错）
  });

  // 4. 测试连接并触发回调
  pool.getConnection()
    .then(connection => {
      success(); // 连接成功，调用回调
      connection.release(); // 释放连接回连接池（不关闭）
    })
    .catch(err => {
      error(err); // 连接失败，传递错误信息给回调
    });

  // 5. 监听连接关闭事件
  pool.on('release', () => {
    console.log('数据库连接已释放回连接池');
  });

  // 6. 暴露连接池（供其他模块调用执行SQL）
  module.exports.pool = pool;
};