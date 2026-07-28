const express = require('express');
const controller = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.getDashboard);

module.exports = router;
