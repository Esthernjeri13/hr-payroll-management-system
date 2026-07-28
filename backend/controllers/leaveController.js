const leaveService = require('../services/leaveService');

async function listLeaveRequests(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const leaveRequests = await leaveService.listLeaveRequests(filters);
    res.json({ leave_requests: leaveRequests });
  } catch (error) {
    next(error);
  }
}

async function createLeaveRequest(req, res, next) {
  try {
    const leaveRequest = await leaveService.createLeaveRequest(req.body, req.user);
    res.status(201).json({ leave_request: leaveRequest });
  } catch (error) {
    next(error);
  }
}

async function approveLeaveRequest(req, res, next) {
  try {
    const leaveRequest = await leaveService.approveLeaveRequest(req.params.id, req.body, req.user);
    res.json({ leave_request: leaveRequest, message: 'Leave approved successfully.' });
  } catch (error) {
    next(error);
  }
}

async function rejectLeaveRequest(req, res, next) {
  try {
    const leaveRequest = await leaveService.rejectLeaveRequest(req.params.id, req.body, req.user);
    res.json({ leave_request: leaveRequest, message: 'Leave rejected successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveLeaveRequest,
  createLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
};
