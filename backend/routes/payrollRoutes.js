const express = require('express');
const controller = require('../controllers/payrollController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listPayroll);
router.post('/generate', requireRole('HR'), controller.generatePayroll);

module.exports = router;
