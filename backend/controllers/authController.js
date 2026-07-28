const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      message: 'Registration successful. Please log in.',
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authService.loginUser(req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  me,
  register,
};
