const payrollService = require('../services/payrollService');

async function generatePayroll(req, res, next) {
  try {
    const result = await payrollService.generatePayroll(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listPayroll(req, res, next) {
  try {
    const records = await payrollService.getPayrollRecords(req.query);
    res.json({ payroll: records });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generatePayroll,
  listPayroll,
};
