const express = require('express');

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const cookieParser = require('cookie-parser');
const session = require('express-session');

const passport = require('passport');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const cycleRoutes = require('./routes/cycleRoutes');
const loanRoutes = require('./routes/loanRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const userRoutes = require('./routes/userRoutes');
const app = express();
require('dotenv').config();

configurePassport();

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    name: 'visionaries.sid',
    secret: process.env.SESSION_SECRET || 'visionaries-dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());


// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Routes
app.get('/', (req, res) => {
  req.session.lastSeenAt = new Date().toISOString();
  res.json({ message: 'Welcome to VISIONARIES-VB API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
🚀 VISIONARIES VB Backend Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
