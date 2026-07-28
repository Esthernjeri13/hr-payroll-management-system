const express = require('express');
const controller = require('../controllers/employeeController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listEmployees);
router.get('/managers', controller.listActiveManagers);
router.get('/:id', controller.getEmployee);
router.post('/', requireRole('HR'), controller.createEmployee);
router.put('/:id', requireRole('HR'), controller.updateEmployee);
router.delete('/:id', requireRole('HR'), controller.deactivateEmployee);

module.exports = router;
