const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../database/db');
const { writeAudit, getIp } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/clients — consultant, operator, analyst, auditor, admin
router.get('/', requirePermission('clients:read'), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const searchPattern = req.query.search ? `%${req.query.search}%` : null;

    const clientsQuery = `
      SELECT c.*,
        COUNT(DISTINCT a.id) AS accounts_count,
        COUNT(DISTINCT l.id) AS loans_count
      FROM clients c
      LEFT JOIN accounts a ON a.client_id = c.id AND a.is_active = true
      LEFT JOIN loans    l ON l.client_id = c.id
      WHERE ($3::text IS NULL
          OR c.last_name       ILIKE $3
          OR c.first_name      ILIKE $3
          OR c.middle_name     ILIKE $3
          OR c.phone           ILIKE $3
          OR c.passport_number ILIKE $3)
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) FROM clients c
      WHERE ($1::text IS NULL
          OR c.last_name       ILIKE $1
          OR c.first_name      ILIKE $1
          OR c.middle_name     ILIKE $1
          OR c.phone           ILIKE $1
          OR c.passport_number ILIKE $1)
    `;

    const [clientsResult, countResult] = await Promise.all([
      db.query(clientsQuery, [limit, offset, searchPattern]),
      db.query(countQuery,   [searchPattern])
    ]);

    const total = parseInt(countResult.rows[0].count);
    res.json({ data: clientsResult.rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения списка клиентов' });
  }
});

// GET /api/clients/:id — consultant, operator, analyst, auditor, admin
router.get('/:id', requirePermission('clients:read'), param('id').isInt(), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', a.id, 'account_number', a.account_number,
          'account_type', a.account_type, 'balance', a.balance,
          'currency', a.currency, 'is_active', a.is_active
        )) FILTER (WHERE a.id IS NOT NULL) AS accounts,
        json_agg(DISTINCT jsonb_build_object(
          'id', l.id, 'amount', l.amount, 'remaining_amount', l.remaining_amount,
          'loan_type', l.loan_type, 'status', l.status,
          'interest_rate', l.interest_rate, 'term_months', l.term_months,
          'monthly_payment', l.monthly_payment,
          'purpose', l.purpose, 'start_date', l.start_date, 'end_date', l.end_date
        )) FILTER (WHERE l.id IS NOT NULL) AS loans
      FROM clients c
      LEFT JOIN accounts a ON a.client_id = c.id
      LEFT JOIN loans    l ON l.client_id = c.id
      WHERE c.id = $1
      GROUP BY c.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения клиента' });
  }
});

// POST /api/clients — consultant, operator, admin
router.post('/', requirePermission('clients:write'), [
  body('last_name').isLength({ min: 2, max: 50 }).trim().escape(),
  body('first_name').isLength({ min: 2, max: 50 }).trim().escape(),
  body('middle_name').optional().trim().escape(),
  body('birth_date').isDate(),
  body('passport_series').isLength({ min: 4, max: 4 }).isNumeric(),
  body('passport_number').isLength({ min: 6, max: 6 }).isNumeric(),
  body('phone').matches(/^\+7\d{10}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').isLength({ min: 5, max: 200 }).trim().escape(),
  body('inn').optional().isLength({ min: 12, max: 12 }).isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { last_name, first_name, middle_name, birth_date, passport_series,
          passport_number, phone, email, address, inn } = req.body;
  try {
    const existing = await db.query(
      'SELECT id FROM clients WHERE passport_series = $1 AND passport_number = $2',
      [passport_series, passport_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Клиент с такими паспортными данными уже существует' });
    }

    const result = await db.query(
      `INSERT INTO clients
        (last_name, first_name, middle_name, birth_date, passport_series,
         passport_number, phone, email, address, inn, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [last_name, first_name, middle_name, birth_date, passport_series,
       passport_number, phone, email, address, inn, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка создания клиента' });
  }
});

// PUT /api/clients/:id — consultant, operator, admin
router.put('/:id', requirePermission('clients:write'), [
  param('id').isInt(),
  body('phone').optional().matches(/^\+7\d{10}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').optional().isLength({ min: 5, max: 200 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone, email, address } = req.body;
  const id = req.params.id;
  try {
    const { rows: oldRows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!oldRows.length) return res.status(404).json({ error: 'Клиент не найден' });

    const result = await db.query(
      `UPDATE clients SET phone=COALESCE($1,phone), email=COALESCE($2,email),
       address=COALESCE($3,address), updated_at=NOW() WHERE id=$4 RETURNING *`,
      [phone, email, address, id]
    );

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'UPDATE', tableName: 'clients',
      recordId: parseInt(id, 10), oldValues: oldRows[0], newValues: result.rows[0],
      ip: getIp(req),
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления клиента' });
  }
});

// DELETE /api/clients/:id — только operator, admin
router.delete('/:id', requirePermission('clients:delete'), param('id').isInt(), async (req, res) => {
  const id = req.params.id;
  try {
    const { rows: oldRows } = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (!oldRows.length) return res.status(404).json({ error: 'Клиент не найден' });

    const result = await db.query(
      'UPDATE clients SET is_active=false, updated_at=NOW() WHERE id=$1 RETURNING id', [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Клиент не найден' });

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'DELETE', tableName: 'clients',
      recordId: parseInt(id, 10), oldValues: oldRows[0], newValues: { is_active: false },
      ip: getIp(req),
    });

    res.json({ message: 'Клиент деактивирован', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка удаления клиента' });
  }
});

module.exports = router;
