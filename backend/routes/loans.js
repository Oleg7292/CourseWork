const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../database/db');
const { writeAudit } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip ?? null;

// GET /api/loans — consultant, operator, analyst, auditor, admin
router.get('/', requirePermission('loans:read'), async (req, res) => {
  try {
    const { status, client_id } = req.query;
    let query = `
      SELECT l.*,
             c.last_name || ' ' || c.first_name AS client_name,
             u.username AS manager_name
      FROM loans l
      JOIN clients c ON c.id = l.client_id
      LEFT JOIN users u ON u.id = l.manager_id
      WHERE 1=1
    `;
    const params = [];
    if (status)    { params.push(status);    query += ` AND l.status = $${params.length}`; }
    if (client_id) { params.push(client_id); query += ` AND l.client_id = $${params.length}`; }
    query += ' ORDER BY l.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения кредитов' });
  }
});

// POST /api/loans — operator, admin
router.post('/', requirePermission('loans:write'), [
  body('client_id').isInt(),
  body('amount').isFloat({ min: 1000 }),
  body('interest_rate').isFloat({ min: 0.1, max: 99 }),
  body('term_months').isInt({ min: 1, max: 360 }),
  body('loan_type').isIn(['consumer', 'mortgage', 'auto', 'business']),
  body('purpose').optional().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { client_id, amount, interest_rate, term_months, loan_type, purpose } = req.body;
  try {
    const monthlyRate = interest_rate / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? amount / term_months
      : (amount * monthlyRate * Math.pow(1 + monthlyRate, term_months)) /
        (Math.pow(1 + monthlyRate, term_months) - 1);

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + parseInt(term_months));

    const result = await db.query(
      `INSERT INTO loans
         (client_id, amount, remaining_amount, interest_rate, term_months,
          monthly_payment, loan_type, purpose, end_date, manager_id)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [client_id, amount, interest_rate, term_months, monthlyPayment.toFixed(2),
       loan_type, purpose, endDate, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка оформления кредита' });
  }
});

// PUT /api/loans/:id/payment — operator, admin
router.put('/:id/payment', requirePermission('loans:payment'), [
  param('id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('account_id').isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { amount, account_id } = req.body;
  const loanId = parseInt(req.params.id, 10);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const loan = await client.query('SELECT * FROM loans WHERE id=$1 FOR UPDATE', [loanId]);
    if (!loan.rows.length) throw { status: 404, message: 'Кредит не найден' };
    if (loan.rows[0].status !== 'active') throw { status: 400, message: 'Кредит не активен' };

    const account = await client.query(
      'SELECT * FROM accounts WHERE id=$1 AND is_active=true FOR UPDATE', [account_id]
    );
    if (!account.rows.length) throw { status: 404, message: 'Счёт не найден' };
    if (parseFloat(account.rows[0].balance) < parseFloat(amount))
      throw { status: 400, message: 'Недостаточно средств' };

    const newRemaining = Math.max(0, parseFloat(loan.rows[0].remaining_amount) - parseFloat(amount));
    const newStatus    = newRemaining === 0 ? 'paid' : 'active';

    await client.query(
      'UPDATE loans SET remaining_amount=$1, status=$2, updated_at=NOW() WHERE id=$3',
      [newRemaining, newStatus, loanId]
    );
    await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [amount, account_id]);
    await client.query(
      `INSERT INTO transactions
         (account_id, transaction_type, amount, balance_after, description, created_by)
       VALUES ($1,'loan_payment',$2,(SELECT balance FROM accounts WHERE id=$1),
               'Погашение кредита #' || $3, $4)`,
      [account_id, amount, loanId, req.user.id]
    );
    await client.query(
      'INSERT INTO loan_payments (loan_id, amount, account_id, created_by) VALUES ($1,$2,$3,$4)',
      [loanId, amount, account_id, req.user.id]
    );

    await client.query('COMMIT');

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'UPDATE', tableName: 'loans', recordId: loanId,
      oldValues: { remaining_amount: loan.rows[0].remaining_amount, status: loan.rows[0].status },
      newValues: { remaining_amount: newRemaining, status: newStatus, payment_amount: amount, account_id },
      ip: getIp(req),
    });

    res.json({ message: 'Платёж внесён', remaining: newRemaining, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Ошибка платежа' });
  } finally { client.release(); }
});

// PUT /api/loans/:id/status — operator, admin
router.put('/:id/status', requirePermission('loans:write'), [
  param('id').isInt(),
  body('status').isIn(['active', 'approved', 'rejected', 'paid', 'overdue']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const loanId = parseInt(req.params.id, 10);
  try {
    const { rows: oldRows } = await db.query('SELECT id, status FROM loans WHERE id=$1', [loanId]);
    if (!oldRows.length) return res.status(404).json({ error: 'Кредит не найден' });

    const result = await db.query(
      'UPDATE loans SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [req.body.status, loanId]
    );

    req._auditDone = true;
    await writeAudit({
      userId: req.user.id, action: 'UPDATE', tableName: 'loans', recordId: loanId,
      oldValues: { status: oldRows[0].status }, newValues: { status: req.body.status },
      ip: getIp(req),
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

module.exports = router;
