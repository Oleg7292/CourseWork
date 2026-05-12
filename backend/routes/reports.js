const express = require('express');
const db = require('../database/db');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/reports/dashboard — analyst, auditor, admin
router.get('/dashboard', requirePermission('reports:read'), async (req, res) => {
  try {
    const [clients, accounts, transactions, loans] = await Promise.all([
      db.query(`SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_month
                FROM clients WHERE is_active = true`),
      db.query(`SELECT COUNT(*) as total, SUM(balance) as total_balance,
                COUNT(*) FILTER (WHERE account_type = 'checking') as checking,
                COUNT(*) FILTER (WHERE account_type = 'savings') as savings,
                COUNT(*) FILTER (WHERE account_type = 'deposit') as deposit
                FROM accounts WHERE is_active = true`),
      db.query(`SELECT COUNT(*) as total,
                SUM(amount) FILTER (WHERE transaction_type = 'deposit') as total_deposits,
                SUM(amount) FILTER (WHERE transaction_type = 'withdrawal') as total_withdrawals,
                SUM(amount) FILTER (WHERE transaction_type IN ('transfer_out','transfer_in')) as total_transfers
                FROM transactions WHERE created_at >= NOW() - INTERVAL '30 days'`),
      db.query(`SELECT COUNT(*) as total,
                SUM(amount) as total_issued,
                SUM(remaining_amount) as total_outstanding,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'overdue') as overdue
                FROM loans`)
    ]);

    const txByDay = await db.query(`
      SELECT DATE(created_at) as date,
             COUNT(*) as count,
             SUM(amount) as volume
      FROM transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    const loansByType = await db.query(`
      SELECT loan_type, COUNT(*) as count, SUM(amount) as total
      FROM loans GROUP BY loan_type
    `);

    const t = transactions.rows[0];

    res.json({
      stats: {
        totalClients:  parseInt(clients.rows[0].total  || 0),
        totalAccounts: parseInt(accounts.rows[0].total || 0),
        txCount:       parseInt(t.total                || 0),
        txVolume:      parseFloat(t.total_deposits     || 0)
                     + parseFloat(t.total_withdrawals  || 0)
                     + parseFloat(t.total_transfers    || 0),
      },
      txByDay:     txByDay.rows,
      loansByType: loansByType.rows.map(r => ({
  ...r,
  count: parseInt(r.count  || 0),
  total: parseFloat(r.total || 0),
})),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// GET /api/reports/clients-by-month — analyst, auditor, admin
router.get('/clients-by-month', requirePermission('reports:read'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
             COUNT(*) as new_clients
      FROM clients
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
