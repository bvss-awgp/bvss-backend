var jwt = require('jsonwebtoken');
var User = require('../models/User');

var requireAuth = async function (req, res, next) {
  try {
    var authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required.' });
    }

    var token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'Authorization token is required.' });
    }

    var jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('Missing JWT_SECRET environment variable.');
      return res.status(500).json({ message: 'Server configuration error.' });
    }

    var payload = jwt.verify(token, jwtSecret);
    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Invalid authorization token.' });
    }

    var user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.auth = {
      token,
      user,
      userId: user._id,
    };

    return next();
  } catch (error) {
    console.error('Authorization error:', error);
    var status = error.name === 'TokenExpiredError' ? 401 : 500;
    var message =
      error.name === 'TokenExpiredError'
        ? 'Authorization token has expired.'
        : 'Unable to authorize request.';
    return res.status(status).json({ message });
  }
};

module.exports = requireAuth;
