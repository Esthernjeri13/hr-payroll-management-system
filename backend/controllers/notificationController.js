const notificationService = require('../services/notificationService');

async function listNotifications(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications();
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.id);
    res.json({ notification });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
};
