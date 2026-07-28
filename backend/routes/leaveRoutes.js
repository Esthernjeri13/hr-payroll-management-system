const express = require('express');
const controller = require('../controllers/leaveController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listLeaveRequests);
router.post('/', controller.createLeaveRequest);
router.put('/:id/approve', requireRole('HR'), controller.approveLeaveRequest);
router.put('/:id/reject', requireRole('HR'), controller.rejectLeaveRequest);

module.exports = router;
