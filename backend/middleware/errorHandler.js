const AppError = require('../utils/appError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode || 500;
  const message = err instanceof AppError ? err.message : err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
