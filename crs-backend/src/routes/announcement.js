const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/admin');

// 公告列表（用户侧）
router.get('/', announcementController.listPublicAnnouncements);

// 管理员：公告列表
router.get('/admin', auth, requireAdmin, announcementController.listAdminAnnouncements);
// 公告详情（用户侧）
router.get('/:id', announcementController.getPublicAnnouncementDetail);
// 管理员：发布公告
router.post('/', auth, requireAdmin, announcementController.createAnnouncement);
// 管理员：更新公告
router.put('/:id', auth, requireAdmin, announcementController.updateAnnouncement);
// 管理员：删除公告
router.delete('/:id', auth, requireAdmin, announcementController.deleteAnnouncement);

module.exports = router;
