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

var app = express();

var clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
var mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MONGODB_URI environment variable.');
  process.exit(1);
}

app.use(logger('dev'));
app.use(cors({ origin: clientOrigin, credentials: true }));
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

// 404 handler - return JSON for API routes
app.use(function(req, res, next) {
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Route not found.' });
  }
  res.status(404).send('Not found');
});

// Error handler - return JSON for API routes
app.use(function(err, req, res, next) {
  console.error('Error:', err);
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ 
      message: err.message || 'Internal server error.',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  res.status(err.status || 500).send(err.message || 'Internal server error');
});

module.exports = app;
