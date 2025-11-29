var mongoose = require('mongoose');

var cookiePreferenceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accepted: {
      type: Boolean,
      default: false,
    },
    essential: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Boolean,
      default: false,
    },
    marketing: {
      type: Boolean,
      default: false,
    },
    preferences: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'cookie_preferences',
  }
);

module.exports = mongoose.model('CookiePreference', cookiePreferenceSchema);

