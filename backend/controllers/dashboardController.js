const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res, next) {
  try {
    const dashboard = await dashboardService.getDashboardSummary();
    res.json({ dashboard });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
