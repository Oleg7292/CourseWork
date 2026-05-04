const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { ROLE_DESCRIPTIONS } = require('../config/permissions');

const router = express.Router();

// POST /api/auth/register
router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).trim().escape(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль должен содержать минимум 8 символов, строчные и заглавные буквы, цифры'),
  body('full_name').isLength({ min: 2, max: 100 }).trim().escape(),
  body('role').isIn(['admin', 'operator', 'consultant', 'analyst', 'auditor']),
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password, full_name, role, email } = req.body;

  try {
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким именем или email уже существует' });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO users (username, password_hash, full_name, role, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, full_name, role, email, created_at`,
      [username, hashedPassword, full_name, role, email]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Аудит регистрации
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
       VALUES ($1, 'REGISTER', 'users', $1, $2)`,
      [user.id, JSON.stringify({ username: user.username, role: user.role })]
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('username').trim().escape(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Аудит неудачного входа
      await db.query(
        `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
         VALUES ($1, 'LOGIN_FAILED', 'users', $1, $2)`,
        [user.id, JSON.stringify({ username: user.username })]
      );
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Аудит успешного входа
    await db.query(
      `INSERT INTO audit_log (user_id, action, table_name, record_id, new_values)
       VALUES ($1, 'LOGIN', 'users', $1, $2)`,
      [user.id, JSON.stringify({ username: user.username, role: user.role })]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, role, email, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// GET /api/auth/roles — справочник всех ролей и их прав
router.get('/roles', (req, res) => {
  const { PERMISSIONS } = require('../config/permissions');
  res.json(
    Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => ({
      role,
      description,
      permissions: PERMISSIONS[role]
    }))
  );
});

module.exports = router;
