const jwt = require('jsonwebtoken');
const { can } = require('../config/permissions');

//Проверка JWT-токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен авторизации отсутствует' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // req.user = { id, username, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен истёк, войдите снова' });
    }
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

const requirePermission = (action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  if (!can(req.user.role, action)) {
    return res.status(403).json({
      error: `Доступ запрещён. Ваша роль (${req.user.role}) не имеет права: ${action}`
    });
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Доступ запрещён. Требуется одна из ролей: ${roles.join(', ')}`
    });
  }
  next();
};

module.exports = { authenticateToken, requirePermission, requireRole };
