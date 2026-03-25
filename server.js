const express = require('express');

const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const passport = require('passport');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
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

// Routes
app.get('/', (req, res) => {
  req.session.lastSeenAt = new Date().toISOString();
  res.json({ message: 'Welcome to VISIONARIES-VB API' });
});

app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
