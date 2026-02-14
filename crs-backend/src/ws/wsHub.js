// WebSocket Hub：负责连接管理与消息推送
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

// 连接池：userId -> Set<ws>
const connections = new Map();

// 记录用户连接（一个用户可有多端在线）
const addConnection = (userId, ws) => {
  const key = String(userId);
  if (!connections.has(key)) connections.set(key, new Set());
  connections.get(key).add(ws);
};

// 移除用户连接（最后一个断开时清理 key）
const removeConnection = (userId, ws) => {
  const key = String(userId);
  const set = connections.get(key);
  if (!set) return;
  set.delete(ws);
  if (!set.size) connections.delete(key);
};

// 初始化 WebSocket 服务，挂载到 HTTP Server 上
const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    let userId = null;

    try {
      // 从 ws 连接 URL 中解析 token，例如：ws://host/ws?token=xxx
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || '';
      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }
      // 验证 token，获取 user_id
      const payload = jwt.verify(token, jwtSecret);
      userId = payload.user_id;
      if (!userId) {
        ws.close(4001, 'Unauthorized');
        return;
      }
    } catch (err) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // 鉴权通过后加入连接池
    addConnection(userId, ws);

    ws.on('close', () => {
      if (userId) removeConnection(userId, ws);
    });

    ws.on('message', (message) => {
      // 简单心跳：客户端发送 ping，服务端回 pong
      if (String(message) === 'ping') {
        ws.send('pong');
      }
    });
  });

  return wss;
};

// 推送消息给指定用户（若用户多端在线则广播）
const notifyUser = (userId, payload) => {
  const key = String(userId);
  const set = connections.get(key);
  if (!set || !set.size) return;

  // 统一序列化为 JSON 字符串
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
};

module.exports = {
  initWebSocket,
  notifyUser
};
