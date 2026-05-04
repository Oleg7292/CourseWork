// backend/routes/transactions.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../database/db');
const { writeAudit, getIp } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/transactions — operator, analyst, auditor, admin (НЕ consultant)
router.get('/', requirePermission('transactions:read'), async (req, res) => {
  try {
    const { account_id, type, date_from, date_to, limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params     = [];

    if (account_id) { params.push(account_id); conditions.push(`t.account_id = $${params.length}`); }
    if (type)       { params.push(type);       conditions.push(`t.transaction_type = $${params.length}`); }
    if (date_from)  { params.push(date_from);  conditions.push(`t.created_at >= $${params.length}`); }
    if (date_to)    { params.push(date_to);    conditions.push(`t.created_at <= $${params.length}`); }

    const whereStr = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT t.*, a.account_number,
                c.last_name || ' ' || c.first_name AS client_name
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         JOIN clients  c ON c.id = a.client_id
         ${whereStr}
         ORDER BY t.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM transactions t ${whereStr}`, params.slice(0, -2)),
    ]);

    res.json({
      data:  dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения транзакций' });
  }
});

// POST /api/transactions/deposit — operator, admin
router.post('/deposit', requirePermission('transactions:write'), [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { account_id, amount, description = 'Пополнение счёта' } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const account = await client.query(
      'SELECT * FROM accounts WHERE id=$1 AND is_active=true FOR UPDATE', [account_id]
    );
    if (!account.rows.length) throw { status: 404, message: 'Счёт не найден или закрыт' };

    await client.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2', [amount, account_id]);

    const tx = await client.query(
      `INSERT INTO transactions
         (account_id, transaction_type, amount, balance_after, description, created_by)
       VALUES ($1, 'deposit', $2, (SELECT balance FROM accounts WHERE id=$1), $3, $4)
       RETURNING *`,
      [account_id, amount, description, req.user.id]
    );

    await client.query('COMMIT');

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'CREATE', tableName: 'transactions',
      recordId: tx.rows[0].id,
      oldValues: { balance: account.rows[0].balance },
      newValues: { type: 'deposit', amount, account_id, balance_after: tx.rows[0].balance_after },
      ip: getIp(req),
    });

    res.status(201).json(tx.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Ошибка пополнения' });
  } finally { client.release(); }
});

// POST /api/transactions/withdraw — operator, admin
router.post('/withdraw', requirePermission('transactions:write'), [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { account_id, amount, description = 'Снятие со счёта' } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const account = await client.query(
      'SELECT * FROM accounts WHERE id=$1 AND is_active=true FOR UPDATE', [account_id]
    );
    if (!account.rows.length) throw { status: 404, message: 'Счёт не найден' };
    if (parseFloat(account.rows[0].balance) < parseFloat(amount))
      throw { status: 400, message: 'Недостаточно средств на счёте' };

    await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [amount, account_id]);

    const tx = await client.query(
      `INSERT INTO transactions
         (account_id, transaction_type, amount, balance_after, description, created_by)
       VALUES ($1, 'withdrawal', $2, (SELECT balance FROM accounts WHERE id=$1), $3, $4)
       RETURNING *`,
      [account_id, amount, description, req.user.id]
    );

    await client.query('COMMIT');

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'CREATE', tableName: 'transactions',
      recordId: tx.rows[0].id,
      oldValues: { balance: account.rows[0].balance },
      newValues: { type: 'withdrawal', amount, account_id, balance_after: tx.rows[0].balance_after },
      ip: getIp(req),
    });

    res.status(201).json(tx.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Ошибка снятия' });
  } finally { client.release(); }
});

// POST /api/transactions/transfer — operator, admin
router.post('/transfer', requirePermission('transactions:write'), [
  body('from_account_id').isInt(),
  body('to_account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { from_account_id, to_account_id, amount, description = 'Перевод между счетами' } = req.body;
  if (from_account_id === to_account_id)
    return res.status(400).json({ error: 'Нельзя переводить на тот же счёт' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const [fromAcc, toAcc] = await Promise.all([
      client.query('SELECT * FROM accounts WHERE id=$1 AND is_active=true FOR UPDATE', [from_account_id]),
      client.query('SELECT * FROM accounts WHERE id=$1 AND is_active=true FOR UPDATE', [to_account_id]),
    ]);

    if (!fromAcc.rows.length) throw { status: 404, message: 'Счёт отправителя не найден' };
    if (!toAcc.rows.length)   throw { status: 404, message: 'Счёт получателя не найден' };
    if (parseFloat(fromAcc.rows[0].balance) < parseFloat(amount))
      throw { status: 400, message: 'Недостаточно средств' };

    await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [amount, from_account_id]);
    await client.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2', [amount, to_account_id]);

    const txOut = await client.query(
      `INSERT INTO transactions
         (account_id, transaction_type, amount, balance_after, related_account_id, description, created_by)
       VALUES ($1,'transfer_out',$2,(SELECT balance FROM accounts WHERE id=$1),$3,$4,$5) RETURNING *`,
      [from_account_id, amount, to_account_id, description, req.user.id]
    );
    await client.query(
      `INSERT INTO transactions
         (account_id, transaction_type, amount, balance_after, related_account_id, description, created_by)
       VALUES ($1,'transfer_in',$2,(SELECT balance FROM accounts WHERE id=$1),$3,$4,$5)`,
      [to_account_id, amount, from_account_id, description, req.user.id]
    );

    await client.query('COMMIT');

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'CREATE', tableName: 'transactions',
      recordId: txOut.rows[0].id,
      oldValues: { from_balance: fromAcc.rows[0].balance },
      newValues: { type: 'transfer', amount, from_account_id, to_account_id },
      ip: getIp(req),
    });

    res.status(201).json(txOut.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Ошибка перевода' });
  } finally { client.release(); }
});

module.exports = router;
