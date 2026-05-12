const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../database/db');
const { writeAudit, getIp } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/accounts — consultant, operator, auditor, admin
router.get('/', requirePermission('accounts:read'), async (req, res) => {
  try {
    const { client_id, type } = req.query;
    let query = `
      SELECT a.*,
             c.last_name || ' ' || c.first_name || ' ' || COALESCE(c.middle_name,'') AS client_name
      FROM accounts a
      JOIN clients c ON c.id = a.client_id
      WHERE a.is_active = true
    `;
    const params = [];
    if (client_id) { params.push(client_id); query += ` AND a.client_id = $${params.length}`; }
    if (type)      { params.push(type);      query += ` AND a.account_type = $${params.length}`; }
    query += ' ORDER BY a.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения счетов' });
  }
});

// POST /api/accounts — consultant, operator, admin
router.post('/', requirePermission('accounts:open'), [
  body('client_id').isInt(),
  body('account_type').isIn(['checking', 'savings', 'deposit', 'credit']),
  body('currency').optional().isIn(['RUB', 'USD', 'EUR']),
  body('initial_balance').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { client_id, account_type, currency = 'RUB', initial_balance = 0 } = req.body;
  try {
    const accountNumber = '408' + Math.floor(Math.random() * 10).toString()
      + '810' + Date.now().toString().slice(-11);

    const result = await db.query(
      `INSERT INTO accounts (client_id, account_number, account_type, currency, balance, opened_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [client_id, accountNumber, account_type, currency, initial_balance, req.user.id]
    );

    if (initial_balance > 0) {
      await db.query(
        `INSERT INTO transactions
           (account_id, transaction_type, amount, balance_after, description, created_by)
         VALUES ($1, 'deposit', $2, $2, 'Начальное пополнение при открытии счёта', $3)`,
        [result.rows[0].id, initial_balance, req.user.id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка открытия счёта' });
  }
});

// PUT /api/accounts/:id/close — только operator, admin
router.put('/:id/close', requirePermission('accounts:close'), param('id').isInt(), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const { rows } = await db.query('SELECT * FROM accounts WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Счёт не найден' });
    if (parseFloat(rows[0].balance) > 0) {
      return res.status(400).json({ error: 'Невозможно закрыть счёт с ненулевым балансом' });
    }

    const result = await db.query(
      'UPDATE accounts SET is_active=false, closed_at=NOW() WHERE id=$1 RETURNING *', [id]
    );

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'UPDATE', tableName: 'accounts', recordId: id,
      oldValues: { is_active: rows[0].is_active, closed_at: rows[0].closed_at },
      newValues: { is_active: false, closed_at: result.rows[0].closed_at },
      ip: getIp(req),
    });

    res.json({ message: 'Счёт закрыт', account: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка закрытия счёта' });
  }
});

module.exports = router;
