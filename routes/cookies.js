var express = require('express');
var CookiePreference = require('../models/CookiePreference');
var crypto = require('crypto');

var router = express.Router();

// Generate or get session ID from cookie
function getSessionId(req, res) {
  var sessionId = req.cookies.sessionId;
  if (!sessionId) {
    // Generate a random session ID
    sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
  }
  return sessionId;
}

// GET /cookies - Get cookie preferences for current session
router.get('/', async function (req, res) {
  try {
    var sessionId = getSessionId(req, res);
    var preference = await CookiePreference.findOne({ sessionId: sessionId }).lean();

    if (!preference) {
      return res.json({
        preferences: {
          accepted: false,
          essential: true,
          analytics: false,
          marketing: false,
          preferences: false,
        },
      });
    }

    return res.json({
      preferences: {
        accepted: preference.accepted,
        essential: preference.essential,
        analytics: preference.analytics,
        marketing: preference.marketing,
        preferences: preference.preferences,
      },
    });
  } catch (error) {
    console.error('Get cookie preferences error:', error);
    return res.status(500).json({ message: 'Unable to fetch cookie preferences.' });
  }
});

// POST /cookies - Save cookie preferences for current session
router.post('/', async function (req, res) {
  try {
    var sessionId = getSessionId(req, res);
    var { accepted, essential, analytics, marketing, preferences } = req.body;

    var preferenceData = {
      sessionId: sessionId,
      accepted: accepted === true || accepted === 'true',
      essential: essential === true || essential === 'true' || essential === undefined,
      analytics: analytics === true || analytics === 'true',
      marketing: marketing === true || marketing === 'true',
      preferences: preferences === true || preferences === 'true',
    };

    var preference = await CookiePreference.findOneAndUpdate(
      { sessionId: sessionId },
      preferenceData,
      { upsert: true, new: true }
    );

    return res.json({
      message: 'Cookie preferences saved successfully.',
      preferences: {
        accepted: preference.accepted,
        essential: preference.essential,
        analytics: preference.analytics,
        marketing: preference.marketing,
        preferences: preference.preferences,
      },
    });
  } catch (error) {
    console.error('Save cookie preferences error:', error);
    return res.status(500).json({ message: 'Unable to save cookie preferences.' });
  }
});

module.exports = router;

