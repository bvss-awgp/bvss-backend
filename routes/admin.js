var express = require('express');
var User = require('../models/User');
var Contribution = require('../models/Contribution');
var ContributionDetail = require('../models/ContributionDetail');
var Repository = require('../models/Repository');
var ContactMessage = require('../models/ContactMessage');
var requireAdmin = require('../middleware/adminAuth');

var router = express.Router();

router.use(requireAdmin);

router.get('/users', async function (req, res) {
  try {
    var users = await User.find({}).select('-passwordHash').lean().sort({ createdAt: -1 });
    return res.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ message: 'Unable to fetch users.' });
  }
});

router.get('/contributions', async function (req, res) {
  try {
    var contributions = await Contribution.find({})
      .populate('user', 'email')
      .lean()
      .sort({ createdAt: -1 });
    
    // Handle cases where user might be deleted
    contributions = contributions.map(function (cont) {
      if (!cont.user) {
        cont.user = { email: 'User deleted' };
      }
      return cont;
    });
    
    return res.json({ contributions });
  } catch (error) {
    console.error('Fetch contributions error:', error);
    return res.status(500).json({ message: 'Unable to fetch contributions.' });
  }
});

router.get('/contribution-details', async function (req, res) {
  try {
    var contributionDetails = await ContributionDetail.find({})
      .populate('user', 'email')
      .lean()
      .sort({ createdAt: -1 });
    
    // Handle cases where user might be deleted
    contributionDetails = contributionDetails.map(function (detail) {
      if (!detail.user) {
        detail.user = { email: 'User deleted' };
      }
      return detail;
    });
    
    return res.json({ contributionDetails });
  } catch (error) {
    console.error('Fetch contribution details error:', error);
    return res.status(500).json({ message: 'Unable to fetch contribution details.' });
  }
});

router.post('/repositories', async function (req, res) {
  try {
    var topicName = req.body.topicName;
    var category = req.body.category;

    if (!topicName || !category) {
      return res.status(400).json({ message: 'Topic name and category are required.' });
    }

    var repository = await Repository.create({
      topicName: topicName.trim(),
      category: category.trim(),
    });

    return res.status(201).json({
      repository,
      message: 'Topic saved successfully.',
    });
  } catch (error) {
    console.error('Save repository error:', error);
    return res.status(500).json({ message: 'Unable to save topic.' });
  }
});

router.get('/repositories', async function (req, res) {
  try {
    var repositories = await Repository.find({}).lean().sort({ createdAt: -1 });
    return res.json({ repositories });
  } catch (error) {
    console.error('Fetch repositories error:', error);
    return res.status(500).json({ message: 'Unable to fetch repositories.' });
  }
});

router.patch('/repositories/:id/status', async function (req, res) {
  try {
    var repositoryId = req.params.id;
    var newStatus = req.body.status;

    if (!newStatus || !['Complete', 'Incomplete'].includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status. Must be "Complete" or "Incomplete".' });
    }

    var repository = await Repository.findByIdAndUpdate(
      repositoryId,
      { status: newStatus },
      { new: true }
    );

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found.' });
    }

    return res.json({
      repository,
      message: 'Status updated successfully.',
    });
  } catch (error) {
    console.error('Update repository status error:', error);
    return res.status(500).json({ message: 'Unable to update status.' });
  }
});

router.delete('/repositories/:id', async function (req, res) {
  try {
    var repositoryId = req.params.id;

    var repository = await Repository.findByIdAndDelete(repositoryId);

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found.' });
    }

    return res.json({
      message: 'Topic deleted successfully.',
    });
  } catch (error) {
    console.error('Delete repository error:', error);
    return res.status(500).json({ message: 'Unable to delete topic.' });
  }
});

router.get('/contact-messages', async function (req, res) {
  try {
    var contactMessages = await ContactMessage.find({})
      .lean()
      .sort({ createdAt: -1 });
    
    return res.json({ contactMessages });
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    return res.status(500).json({ message: 'Unable to fetch contact messages.' });
  }
});

module.exports = router;

