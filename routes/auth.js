var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var User = require('../models/User');
var requireAuth = require('../middleware/auth');

var router = express.Router();

var createToken = function (userId) {
  var jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }

  return jwt.sign(
    {
      sub: userId,
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

router.post('/signup', async function (req, res) {
  try {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    var existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    var passwordHash = await bcrypt.hash(password, 10);
    var user = await User.create({
      email,
      passwordHash,
    });

    var token = createToken(user._id);

    return res.status(201).json({
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Signup error:', error);
    var message =
      error.message === 'Missing JWT_SECRET environment variable.'
        ? 'Server configuration error.'
        : 'Unable to sign up.';
    return res.status(500).json({ message });
  }
});

router.post('/login', async function (req, res) {
  try {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    var user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    var passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    var token = createToken(user._id);

    return res.json({
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Login error:', error);
    var message =
      error.message === 'Missing JWT_SECRET environment variable.'
        ? 'Server configuration error.'
        : 'Unable to log in.';
    return res.status(500).json({ message });
  }
});

router.delete('/account', requireAuth, async function (req, res) {
  try {
    var userId = req.auth.userId;

    // Only delete user credentials, keep contribution data
    await User.findByIdAndDelete(userId);

    return res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ message: 'Unable to delete account.' });
  }
});

module.exports = router;

