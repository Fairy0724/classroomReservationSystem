const express = require('express')
const cors = require('cors')
// 导入配置项
const { dbHost, dbPort, dbName } = require('./config/config');
const app = express()
module.exports = app;