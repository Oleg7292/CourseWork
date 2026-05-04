// backend/routes/employees.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../database/db');
const { requireRole } = require('../middleware/authMiddleware');
const { writeAudit }  = require('../middleware/auditMiddleware');

const router = express.Router();

// Хелпер IP
const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? null;

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.is_active = true
       ORDER BY e.last_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения сотрудников' });
  }
});

// POST /api/employees — только admin
// auditMiddleware автологирует CREATE через req.body
router.post('/', requireRole(['admin']), [
  body('last_name').isLength({ min: 2, max: 50 }).trim().escape(),
  body('first_name').isLength({ min: 2, max: 50 }).trim().escape(),
  body('middle_name').optional().trim().escape(),
  body('position').isLength({ min: 2, max: 100 }).trim().escape(),
  body('department_id').isInt(),
  body('phone').optional().matches(/^\+7\d{10}$/),
  body('email').isEmail().normalizeEmail(),
  body('hire_date').isDate(),
  body('salary').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { last_name, first_name, middle_name, position,
          department_id, phone, email, hire_date, salary } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO employees
         (last_name, first_name, middle_name, position, department_id,
          phone, email, hire_date, salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [last_name, first_name, middle_name, position, department_id,
       phone, email, hire_date, salary]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка добавления сотрудника' });
  }
});

// DELETE /api/employees/:id — только admin, soft delete + аудит вручную
router.delete('/:id', requireRole(['admin']), param('id').isInt(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    // Берём данные ДО деактивации для old_values
    const { rows: oldRows } = await db.query(
      'SELECT * FROM employees WHERE id = $1', [id]
    );
    if (!oldRows.length) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }

    await db.query(
      'UPDATE employees SET is_active = false WHERE id = $1', [id]
    );

    req._auditDone = true;
    await writeAudit({
      userId:    req.user.id,
      action:    'DELETE',
      tableName: 'employees',
      recordId:  id,
      oldValues: oldRows[0],
      newValues: { is_active: false },
      ip:        getIp(req),
    });

    res.json({ message: 'Сотрудник деактивирован' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления сотрудника' });
  }
});

module.exports = router;
