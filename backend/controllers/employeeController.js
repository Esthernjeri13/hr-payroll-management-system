const employeeService = require('../services/employeeService');

async function listEmployees(req, res, next) {
  try {
    const activeParam = req.query.active;
    const filters = {};

    if (activeParam === 'true') {
      filters.active = true;
    } else if (activeParam === 'false') {
      filters.active = false;
    }

    const employees = await employeeService.listEmployees(filters);
    res.json({ employees });
  } catch (error) {
    next(error);
  }
}

async function getEmployee(req, res, next) {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.json({ employee });
  } catch (error) {
    next(error);
  }
}

async function createEmployee(req, res, next) {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json({ employee });
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    res.json({ employee });
  } catch (error) {
    next(error);
  }
}

async function deactivateEmployee(req, res, next) {
  try {
    const employee = await employeeService.deactivateEmployee(req.params.id);
    res.json({ employee, message: 'Employee deactivated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function listActiveManagers(req, res, next) {
  try {
    const employees = await employeeService.listEmployees({ active: true });
    res.json({
      managers: employees.filter((employee) => employee.active),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  listActiveManagers,
  listEmployees,
  updateEmployee,
};
