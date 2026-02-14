const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middlewares/auth');

// 消息相关路由
// 获取未读消息数量
router.get('/unread-count', auth, messageController.getUnreadCount);
// 获取消息列表（支持分页和过滤）
router.get('/', auth, messageController.listMessages);
// 写入单条消息
router.post('/', auth, messageController.createMessage);
// 批量写入消息
router.post('/batch', auth, messageController.batchCreateMessages);
// 批量标记为已读
router.put('/batch-read', auth, messageController.batchRead);
// 标记所有消息为已读
router.post('/mark-all-read', auth, messageController.markAllRead);
// 标记单条消息为已读
router.put('/:id/read', auth, messageController.markAsRead);
// 获取消息详情
router.get('/:id', auth, messageController.getMessageDetail);
// 删除消息
router.delete('/:id', auth, messageController.deleteMessage);

module.exports = router;
