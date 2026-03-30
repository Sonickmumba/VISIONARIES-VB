const express = require('express');

const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const passport = require('passport');
const db = require('./config/database');
const configurePassport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const cycleRoutes = require('./routes/cycleRoutes');
const loanRoutes = require('./routes/loanRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const userRoutes = require('./routes/userRoutes');
const { authenticate } = require('./middleware/auth');
const app = express();
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

configurePassport();

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
  throw new Error('SESSION_SECRET must be set when NODE_ENV=production');
}

const resolvedSessionSecret = sessionSecret || 'visionaries-dev-session-secret';
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    name: 'visionaries.sid',
    secret: resolvedSessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: db.pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
    }),
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

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});


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

// File upload endpoint
app.post('/api/upload', authenticate, upload.single('proof'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'visionaries-vb/payment-proofs',
          public_id: `proof-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/users', userRoutes);

// Serve static React files in production
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for React Router (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dist', 'index.html'));
});

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
