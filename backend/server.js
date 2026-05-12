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
const auditRoutes        = require('./routes/audit');           

const { authenticateToken } = require('./middleware/authMiddleware');
const { auditMiddleware }   = require('./middleware/auditMiddleware'); 

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 200,
  message: { error: 'Слишком много запросов, попробуйте позже' }
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Слишком много попыток входа, попробуйте через 15 минут' }
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'http://localhost'
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/clients',      authenticateToken, auditMiddleware, clientsRoutes);
app.use('/api/accounts',     authenticateToken, auditMiddleware, accountsRoutes);
app.use('/api/transactions', authenticateToken, auditMiddleware, transactionsRoutes);
app.use('/api/loans',        authenticateToken, auditMiddleware, loansRoutes);
app.use('/api/employees',    authenticateToken, auditMiddleware, employeesRoutes);
app.use('/api/reports',      authenticateToken, reportsRoutes);
app.use('/api/audit',        authenticateToken, auditRoutes); 

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

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
