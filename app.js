require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var contactRouter = require('./routes/contact');
var contributionsRouter = require('./routes/contributions');
var adminRouter = require('./routes/admin');
var youtubeRouter = require('./routes/youtube');
var blogsRouter = require('./routes/blogs');
var cookiesRouter = require('./routes/cookies');
var otpRouter = require('./routes/otp');

var app = express();

var clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
var mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MONGODB_URI environment variable.');
  process.exit(1);
}

app.use(logger('dev'));

// CORS configuration - more permissive for debugging
var corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    var allowedOrigins = [
      clientOrigin,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    // Also check if CLIENT_ORIGIN contains wildcard or multiple origins
    if (process.env.CLIENT_ORIGIN) {
      var origins = process.env.CLIENT_ORIGIN.split(',').map(function(o) { return o.trim(); });
      allowedOrigins = allowedOrigins.concat(origins);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(function(allowed) {
      return origin && origin.startsWith(allowed.replace('*', ''));
    })) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(null, true); // Allow for now to debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', function(req, res) {
  console.log('🔄 OPTIONS preflight request:', req.method, req.path, 'Origin:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Request logging middleware - must be after body parsers
app.use(function(req, res, next) {
  if (req.method !== 'OPTIONS') {
    console.log('📥 Incoming request:', req.method, req.path, req.originalUrl);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('Request body:', JSON.stringify(req.body));
    }
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(function () {
    console.log('Connected to MongoDB');
    if (mongoose.connection.db) {
      console.log('Mongo namespace:', mongoose.connection.db.namespace);
    }
  })
  .catch(function (error) {
    console.error('MongoDB connection error:', error);
  });

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/contact', contactRouter);
app.use('/contributions', contributionsRouter);
app.use('/admin', adminRouter);
app.use('/youtube', youtubeRouter);
app.use('/blogs', blogsRouter);
app.use('/cookies', cookiesRouter);
app.use('/otp', otpRouter);

// 404 handler - return JSON for API routes
app.use(function(req, res, next) {
  console.log('404 Handler - Method:', req.method, 'Path:', req.path, 'Original URL:', req.originalUrl);
  // Check if it's an API route (starts with /admin, /api, /auth, /otp, /contact, /contributions, /users, /youtube, /blogs, /cookies)
  if (req.originalUrl.startsWith('/admin') || 
      req.originalUrl.startsWith('/api') || 
      req.originalUrl.startsWith('/auth') ||
      req.originalUrl.startsWith('/otp') ||
      req.originalUrl.startsWith('/contact') ||
      req.originalUrl.startsWith('/contributions') ||
      req.originalUrl.startsWith('/users') ||
      req.originalUrl.startsWith('/youtube') ||
      req.originalUrl.startsWith('/blogs') ||
      req.originalUrl.startsWith('/cookies')) {
    return res.status(404).json({ message: 'Route not found.', path: req.path, originalUrl: req.originalUrl });
  }
  res.status(404).send('Not found');
});

// Error handler - return JSON for API routes
app.use(function(err, req, res, next) {
  console.error('Error:', err);
  // Check if it's an API route
  if (req.path.startsWith('/admin') || 
      req.path.startsWith('/api') || 
      req.path.startsWith('/auth') ||
      req.path.startsWith('/otp') ||
      req.path.startsWith('/contact') ||
      req.path.startsWith('/contributions') ||
      req.path.startsWith('/users') ||
      req.path.startsWith('/youtube') ||
      req.path.startsWith('/blogs') ||
      req.path.startsWith('/cookies')) {
    return res.status(err.status || 500).json({ 
      message: err.message || 'Internal server error.',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  res.status(err.status || 500).send(err.message || 'Internal server error');
});

module.exports = app;
