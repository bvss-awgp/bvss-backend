var express = require('express');
var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var OTP = require('../models/OTP');
var User = require('../models/User');
var { sendOTPEmail } = require('../services/mailer');

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

// Generate 6-digit OTP
var generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique session ID
var generateSessionId = function () {
  return crypto.randomBytes(32).toString('hex');
};

// Send OTP endpoint
router.post('/send', async function (req, res) {
  try {
    console.log('📧 OTP send POST request received');
    console.log('Request body:', { email: req.body?.email, hasPassword: !!req.body?.password, hasName: !!req.body?.name });
    console.log('Request headers:', req.headers);
    
    var email = req.body.email;
    var password = req.body.password;
    var name = req.body.name || '';

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    email = email.toLowerCase().trim();

    // Check if user already exists
    var existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    // Hash password
    var passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP and session ID
    var otp = generateOTP();
    var sessionId = generateSessionId();

    // Set expiration (3 minutes from now)
    var expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Create new OTP record
    var otpRecord = await OTP.create({
      email,
      otp,
      sessionId,
      passwordHash,
      name: name.trim(),
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Send OTP email (non-blocking)
    sendOTPEmail(email, otp, name).catch(function(error) {
      console.error('Failed to send OTP email:', error);
      // Don't fail the request if email fails
    });

    console.log('✅ OTP generated and stored. Email:', email, 'Session ID:', sessionId, 'OTP:', otp);

    return res.status(200).json({
      message: 'OTP sent successfully.',
      sessionId: sessionId,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ message: 'Unable to send OTP. Please try again.' });
  }
});

// Verify OTP endpoint
router.post('/verify', async function (req, res) {
  try {
    console.log('🔐 OTP verify request received:', { email: req.body.email, hasOTP: !!req.body.otp, hasSessionId: !!req.body.sessionId });
    
    var email = req.body.email;
    var otp = req.body.otp;
    var sessionId = req.body.sessionId;

    if (!email || !otp || !sessionId) {
      console.log('❌ Missing email, OTP, or sessionId');
      return res.status(400).json({ message: 'Email, OTP, and session ID are required.' });
    }

    email = email.toLowerCase().trim();

    // Find OTP record
    var otpRecord = await OTP.findOne({ email, sessionId });

    if (!otpRecord) {
      return res.status(404).json({ message: 'Invalid session. Please request a new OTP.' });
    }

    // Check if already verified
    if (otpRecord.verified) {
      return res.status(400).json({ message: 'OTP has already been used.' });
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ message: 'Too many attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      var remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
      return res.status(400).json({
        message: 'Invalid OTP. ' + remainingAttempts + ' attempt(s) remaining.',
      });
    }

    // OTP is valid - create user account
    var user = await User.create({
      email: otpRecord.email,
      passwordHash: otpRecord.passwordHash,
    });

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Delete OTP record (cleanup)
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate token
    var token = createToken(user._id);

    console.log('User account created via OTP verification:', email);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    // Check if user already exists (race condition)
    if (error.code === 11000 || error.message.includes('duplicate')) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    return res.status(500).json({ message: 'Unable to verify OTP. Please try again.' });
  }
});

// Resend OTP endpoint
router.post('/resend', async function (req, res) {
  try {
    console.log('🔄 OTP resend request received:', { email: req.body.email, hasSessionId: !!req.body.sessionId });
    
    var email = req.body.email;
    var sessionId = req.body.sessionId;

    if (!email || !sessionId) {
      console.log('❌ Missing email or sessionId');
      return res.status(400).json({ message: 'Email and session ID are required.' });
    }

    email = email.toLowerCase().trim();

    // Find existing OTP record
    var otpRecord = await OTP.findOne({ email, sessionId });

    if (!otpRecord) {
      return res.status(404).json({ message: 'Invalid session. Please start the signup process again.' });
    }

    // Check if already verified
    if (otpRecord.verified) {
      return res.status(400).json({ message: 'OTP has already been verified.' });
    }

    // Generate new OTP
    var newOTP = generateOTP();

    // Reset expiration (3 minutes from now)
    var expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);

    // Update OTP record
    otpRecord.otp = newOTP;
    otpRecord.expiresAt = expiresAt;
    otpRecord.attempts = 0; // Reset attempts
    await otpRecord.save();

    // Send new OTP email (non-blocking)
    sendOTPEmail(email, newOTP, otpRecord.name).catch(function(error) {
      console.error('Failed to send OTP email:', error);
      // Don't fail the request if email fails
    });

    console.log('OTP resent to:', email);

    return res.status(200).json({
      message: 'OTP resent successfully.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Unable to resend OTP. Please try again.' });
  }
});

module.exports = router;

