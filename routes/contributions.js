var express = require('express');
var Contribution = require('../models/Contribution');
var ContributionDetail = require('../models/ContributionDetail');
var Repository = require('../models/Repository');
var { sendContributionConfirmation } = require('../services/mailer');
var requireAuth = require('../middleware/auth');

var router = express.Router();

router.use(requireAuth);

router.get('/me', async function (req, res) {
  try {
    var contribution = await Contribution.findOne({ user: req.auth.userId }).lean();
    return res.json({ contribution: contribution || null });
  } catch (error) {
    console.error('Fetch contribution error:', error);
    return res.status(500).json({ message: 'Unable to fetch contribution profile.' });
  }
});

router.post('/', async function (req, res) {
  try {
    var body = req.body || {};
    var requiredFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'gender',
      'gayatriPariwarDuration',
      'akhandJyotiMember',
      'guruDiksha',
      'missionBooksRead',
      'researchCategories',
      'hoursPerWeek',
      'consent',
    ];

    for (var i = 0; i < requiredFields.length; i += 1) {
      var field = requiredFields[i];
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return res.status(400).json({ message: 'Missing required field: ' + field + '.' });
      }
    }

    if (!Array.isArray(body.researchCategories) || body.researchCategories.length < 3) {
      return res.status(400).json({ message: 'Select at least three research categories.' });
    }

    var userId = req.auth.userId;
    var existing = await Contribution.findOne({ user: userId });

    if (existing) {
      var existingMessage =
        'Your contribution profile is already recorded. New submissions are saved for review but do not overwrite your profile automatically.';

      // Fetch a random topic from Repository based on user's research categories
      var selectedTopic = null;
      try {
        // Get a random incomplete topic that matches user's categories
        var incompleteTopics = await Repository.aggregate([
          {
            $match: {
              category: { $in: body.researchCategories },
              status: 'Incomplete',
            },
          },
          { $sample: { size: 1 } },
        ]);

        if (incompleteTopics.length > 0) {
          selectedTopic = incompleteTopics[0];
          
          // Mark topic as "Allotted" so it won't be assigned to another user
          await Repository.findByIdAndUpdate(selectedTopic._id, {
            status: 'Allotted'
          });
          console.log('✅ Topic marked as Allotted (update):', selectedTopic._id, selectedTopic.topicName);
        }
      } catch (topicError) {
        console.error('Failed to fetch topic from repository:', topicError);
        // Continue without topic - will use default values
      }

      try {
        await ContributionDetail.create({
          user: userId,
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          gender: body.gender,
          gayatriPariwarDuration: body.gayatriPariwarDuration,
          akhandJyotiMember: body.akhandJyotiMember,
          guruDiksha: body.guruDiksha,
          missionBooksRead: body.missionBooksRead,
          researchCategories: body.researchCategories,
          hoursPerWeek: body.hoursPerWeek,
          consent: Boolean(body.consent),
          source: 'contribution-form-update-ignored',
          assignedTopic: selectedTopic ? selectedTopic.topicName : null,
          assignedTopicCode: selectedTopic ? selectedTopic._id.toString().substring(0, 8).toUpperCase() : null,
        });
      } catch (detailError) {
        console.error('Failed to record contribution detail:', detailError);
      }

      // Send confirmation email (non-blocking)
      sendContributionConfirmation(body.email, {
        firstName: body.firstName,
        message: existingMessage,
        topicName: selectedTopic ? selectedTopic.topicName : null,
        topicCategory: selectedTopic ? selectedTopic.category : null,
        topicCode: selectedTopic ? selectedTopic._id.toString().substring(0, 8).toUpperCase() : null,
      }).catch(function() {
        // Error already logged in mailer service
      });

      return res.json({
        contribution: existing,
        message: existingMessage,
      });
    }

    var contribution = await Contribution.create({
      user: userId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      gender: body.gender,
      gayatriPariwarDuration: body.gayatriPariwarDuration,
      akhandJyotiMember: body.akhandJyotiMember,
      guruDiksha: body.guruDiksha,
      missionBooksRead: body.missionBooksRead,
      researchCategories: body.researchCategories,
      hoursPerWeek: body.hoursPerWeek,
      consent: Boolean(body.consent),
    });

    var creationMessage = 'Thank you! Your contribution profile has been recorded.';

    // Fetch a random topic from Repository based on user's research categories
    var selectedTopic = null;
    try {
      // Get a random incomplete topic that matches user's categories
      var incompleteTopics = await Repository.aggregate([
        {
          $match: {
            category: { $in: body.researchCategories },
            status: 'Incomplete',
          },
        },
        { $sample: { size: 1 } },
      ]);

      if (incompleteTopics.length > 0) {
        selectedTopic = incompleteTopics[0];
        
        // Mark topic as "Allotted" so it won't be assigned to another user
        await Repository.findByIdAndUpdate(selectedTopic._id, {
          status: 'Allotted'
        });
        console.log('✅ Topic marked as Allotted:', selectedTopic._id, selectedTopic.topicName);
      }
    } catch (topicError) {
      console.error('Failed to fetch topic from repository:', topicError);
      // Continue without topic - will use default values
    }

    try {
      await ContributionDetail.create({
        user: userId,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        gender: body.gender,
        gayatriPariwarDuration: body.gayatriPariwarDuration,
        akhandJyotiMember: body.akhandJyotiMember,
        guruDiksha: body.guruDiksha,
        missionBooksRead: body.missionBooksRead,
        researchCategories: body.researchCategories,
        hoursPerWeek: body.hoursPerWeek,
        consent: Boolean(body.consent),
        source: 'contribution-form-create',
        assignedTopic: selectedTopic ? selectedTopic.topicName : null,
        assignedTopicCode: selectedTopic ? selectedTopic._id.toString().substring(0, 8).toUpperCase() : null,
      });
    } catch (detailCreateError) {
      console.error('Failed to record contribution detail:', detailCreateError);
    }

    // Send confirmation email (non-blocking)
    sendContributionConfirmation(body.email, {
      firstName: body.firstName,
      message: creationMessage,
      topicName: selectedTopic ? selectedTopic.topicName : null,
      topicCategory: selectedTopic ? selectedTopic.category : null,
      topicCode: selectedTopic ? selectedTopic._id.toString().substring(0, 8).toUpperCase() : null,
    }).catch(function() {
      // Error already logged in mailer service
    });

    return res.status(201).json({
      contribution,
      message: creationMessage,
    });
  } catch (error) {
    console.error('Upsert contribution error:', error);
    return res.status(500).json({ message: 'Unable to save contribution profile.' });
  }
});

router.patch('/me', async function (req, res) {
  try {
    var userId = req.auth.userId;
    var existing = await Contribution.findOne({ user: userId });

    if (!existing) {
      return res.status(404).json({ message: 'Contribution profile not found. Please submit the contribution form first.' });
    }

    var body = req.body || {};
    var allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'gender',
      'gayatriPariwarDuration',
      'akhandJyotiMember',
      'guruDiksha',
      'missionBooksRead',
      'researchCategories',
      'hoursPerWeek',
    ];

    var updateData = {};
    for (var i = 0; i < allowedFields.length; i += 1) {
      var field = allowedFields[i];
      if (body[field] !== undefined && body[field] !== null) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Validate research categories if being updated
    if (updateData.researchCategories !== undefined) {
      if (!Array.isArray(updateData.researchCategories) || updateData.researchCategories.length < 3) {
        return res.status(400).json({ message: 'Select at least three research categories.' });
      }
    }

    var updated = await Contribution.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.json({
      contribution: updated,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    console.error('Update contribution error:', error);
    return res.status(500).json({ message: 'Unable to update contribution profile.' });
  }
});

module.exports = router;
