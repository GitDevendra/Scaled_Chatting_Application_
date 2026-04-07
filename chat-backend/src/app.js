const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const conversationRoutes = require('./routes/conversation.routes');
const messageRoutes      = require('./routes/message.routes');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());  

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,   
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages',      messageRoutes);

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;