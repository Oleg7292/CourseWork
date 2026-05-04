const express = require('express');
const db = require('../database/db');
const { requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/audit
 * Журнал аудита — только analyst и auditor и admin
 * Фильтры: user_id, action, table_name, date_from, date_to
 */
router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    const { user_id, action, table_name, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (user_id)    { params.push(user_id);    conditions.push(`al.user_id = $${params.length}`); }
    if (action)     { params.push(action);     conditions.push(`al.action = $${params.length}`); }
    if (table_name) { params.push(table_name); conditions.push(`al.table_name = $${params.length}`); }
    if (date_from)  { params.push(date_from);  conditions.push(`al.created_at >= $${params.length}`); }
    if (date_to)    { params.push(date_to);    conditions.push(`al.created_at <= $${params.length}`); }

    const whereStr = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const result = await db.query(
      `SELECT al.*,
              u.username, u.full_name as user_full_name, u.role as user_role
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
       ${whereStr}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM audit_log al ${whereStr}`,
      params.slice(0, -2)
    );

    res.json({
      rows: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения журнала аудита' });
  }
});

/**
 * GET /api/audit/stats
 * Статистика по журналу аудита (топ действий, активных пользователей)
 */
router.get('/stats', requirePermission('audit:read'), async (req, res) => {
  try {
    const [actionStats, userStats, tableStats] = await Promise.all([
      db.query(`SELECT action, COUNT(*) as count
                FROM audit_log
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY action ORDER BY count DESC`),
      db.query(`SELECT u.username, u.role, COUNT(al.id) as actions_count
                FROM audit_log al
                JOIN users u ON u.id = al.user_id
                WHERE al.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY u.id, u.username, u.role
                ORDER BY actions_count DESC LIMIT 10`),
      db.query(`SELECT table_name, COUNT(*) as count
                FROM audit_log
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY table_name ORDER BY count DESC`)
    ]);

    res.json({
      byAction: actionStats.rows,
      byUser: userStats.rows,
      byTable: tableStats.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения статистики аудита' });
  }
});

module.exports = router;
