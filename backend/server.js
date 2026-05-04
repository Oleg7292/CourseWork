require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const clientsRoutes      = require('./routes/clients');
const accountsRoutes     = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const loansRoutes        = require('./routes/loans');
const employeesRoutes    = require('./routes/employees');
const reportsRoutes      = require('./routes/reports');
const auditRoutes        = require('./routes/audit');           // ← НОВОЕ

const { authenticateToken } = require('./middleware/authMiddleware');
const { auditMiddleware }   = require('./middleware/auditMiddleware'); // ← НОВОЕ

const app  = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200,
  message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Слишком много попыток входа, попробуйте через 15 минут' }
});

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'http://localhost'
    : 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',         authLimiter, authRoutes);
// ↓ auditMiddleware стоит ПОСЛЕ authenticateToken — req.user уже есть
app.use('/api/clients',      authenticateToken, auditMiddleware, clientsRoutes);
app.use('/api/accounts',     authenticateToken, auditMiddleware, accountsRoutes);
app.use('/api/transactions', authenticateToken, auditMiddleware, transactionsRoutes);
app.use('/api/loans',        authenticateToken, auditMiddleware, loansRoutes);
app.use('/api/employees',    authenticateToken, auditMiddleware, employeesRoutes);
app.use('/api/reports',      authenticateToken, reportsRoutes);
app.use('/api/audit',        authenticateToken, auditRoutes);   // ← НОВОЕ

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Внутренняя ошибка сервера'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Режим: ${process.env.NODE_ENV}`);
});

module.exports = app;
