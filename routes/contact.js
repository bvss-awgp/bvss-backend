var express = require('express');
var ContactMessage = require('../models/ContactMessage');
var { sendContactConfirmation, sendAdminContactNotification } = require('../services/mailer');

var router = express.Router();

router.post('/', async function (req, res) {
  try {
    var name = req.body.name;
    var email = req.body.email;
    var inquiryType = req.body.inquiryType;
    var message = req.body.message;

    if (!name || !email || !message || !inquiryType) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    var contactMessage = await ContactMessage.create({
      name,
      email,
      inquiryType,
      message,
    });

    // Send confirmation email to user (non-blocking)
    sendContactConfirmation(email, {
      name: name,
      inquiryType: inquiryType,
    }).catch(function() {
      // Error already logged in mailer service
    });

    // Send notification email to admin(s) (non-blocking)
    // Support multiple emails separated by commas
    var adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      // Split by comma and trim whitespace, filter out empty strings
      var adminEmails = adminEmail.split(',').map(function(email) {
        return email.trim();
      }).filter(function(email) {
        return email.length > 0;
      });
      
      // Send to all admin emails
      adminEmails.forEach(function(email) {
        sendAdminContactNotification(email, {
          name: name,
          email: email,
          inquiryType: inquiryType,
          message: message,
        }).catch(function() {
          // Error already logged in mailer service
        });
      });
    }

    return res.status(201).json({
      message: 'Message received.',
      contact: {
        id: contactMessage._id,
        name: contactMessage.name,
        email: contactMessage.email,
        inquiryType: contactMessage.inquiryType,
        message: contactMessage.message,
        createdAt: contactMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    return res.status(500).json({ message: 'Unable to submit message.' });
  }
});

module.exports = router;
