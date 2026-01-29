const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const auth = require('../middlewares/auth');

// 待审批列表
router.get('/pending', auth, approvalController.getPendingApprovals);

// 审批记录
router.get('/records', auth, approvalController.getApprovalRecords);

// 审批统计
router.get('/stats', auth, approvalController.getApprovalStats);

// 审批详情
router.get('/:id', auth, approvalController.getApprovalDetail);

// 提交审批（通过/驳回）
router.post('/:id/submit', auth, approvalController.submitApproval);

module.exports = router;
