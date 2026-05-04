// backend/middleware/auditMiddleware.js

const db = require('../database/db');

const URL_TO_TABLE = {
  clients:      'clients',
  accounts:     'accounts',
  transactions: 'transactions',
  loans:        'loans',
  employees:    'employees',
  auth:         'users',
};

// DELETE убран — old_values в middleware получить невозможно.
// DELETE логировать вручную через writeAudit() в самом роуте.
const METHOD_TO_ACTION = {
  POST:  'CREATE',
  PUT:   'UPDATE',
  PATCH: 'UPDATE',
};

/**
 * writeAudit({ userId, action, tableName, recordId, oldValues, newValues, ip })
 * Прямая запись одной строки в audit_log.
 * Обязательно вызывать вручную для DELETE и PUT (чтобы сохранить old_values).
 */
async function writeAudit({ userId, action, tableName, recordId, oldValues, newValues, ip }) {
  try {
    const safeNew = newValues ? sanitize(newValues) : null;
    const safeOld = oldValues ? sanitize(oldValues) : null;

    await db.query(
      `INSERT INTO audit_log
         (user_id, action, table_name, record_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet)`,
      [
        userId    ?? null,
        action,
        tableName ?? null,
        recordId  ?? null,
        safeOld   ? JSON.stringify(safeOld) : null,
        safeNew   ? JSON.stringify(safeNew) : null,
        cleanIp(ip),
      ]
    );
  } catch (err) {
    console.error('[AUDIT ERROR]', err.message);
  }
}

/**
 * auditMiddleware
 * Автоматически логирует POST/PUT/PATCH (не DELETE — нет old_values).
 * Подключать в server.js ПОСЛЕ authenticateToken, ДО роутов.
 *
 * Если роут сам вызвал writeAudit и выставил req._auditDone = true,
 * middleware пропускает дублирование.
 */
function auditMiddleware(req, res, next) {
  if (!METHOD_TO_ACTION[req.method]) return next();

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (res.statusCode >= 400 || req._auditDone) return originalJson(body);

    const userId = req.user?.id ?? null;
    const ip     = getIp(req);
    const action = METHOD_TO_ACTION[req.method];

    // baseUrl: '/api/clients' → pop() → 'clients'
    const segment   = req.baseUrl.split('/').pop();
    const tableName = URL_TO_TABLE[segment] ?? segment ?? null;

    // recordId: сначала из тела ответа, потом из URL-сегмента
    const pathSegment = req.path.replace(/^\//, '').split('/')[0];
    const recordId =
      body?.id ??
      body?.data?.id ??
      (pathSegment && /^\d+$/.test(pathSegment) ? parseInt(pathSegment, 10) : null);

    writeAudit({
      userId,
      action,
      tableName,
      recordId,
      oldValues: null,           // old_values для PUT — вручную через writeAudit в роуте
      newValues: req.body ?? null,
      ip,
    });

    return originalJson(body);
  };

  next();
}

// ── helpers ──────────────────────────────────────────────────────────────────

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const SENSITIVE = ['password', 'password_hash', 'token', 'refresh_token', 'secret'];
  const result = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of SENSITIVE) {
    if (key in result) result[key] = '[REDACTED]';
  }
  return result;
}

function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? null;
}

function cleanIp(ip) {
  if (!ip) return null;
  return ip.replace(/^::ffff:/, '');
}

module.exports = { auditMiddleware, writeAudit, getIp };
