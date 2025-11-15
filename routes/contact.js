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

    // Send confirmation email to user
    try {
      await sendContactConfirmation(email, {
        name: name,
        inquiryType: inquiryType,
      });
    } catch (emailError) {
      console.error('Failed to send contact confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification email to admin
    var adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      try {
        await sendAdminContactNotification(adminEmail, {
          name: name,
          email: email,
          inquiryType: inquiryType,
          message: message,
        });
      } catch (adminEmailError) {
        console.error('Failed to send admin contact notification email:', adminEmailError);
        // Don't fail the request if email fails
      }
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
