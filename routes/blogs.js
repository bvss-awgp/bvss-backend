var express = require('express');
var Blog = require('../models/Blog');

var router = express.Router();

// GET /blogs - Get all published blogs, optionally filtered by category
router.get('/', async function (req, res) {
  try {
    var category = req.query.category;
    var query = { is_published: true };
    
    if (category && category !== 'All') {
      query.category = category;
    }

    var blogs = await Blog.find(query)
      .select('-content') // Don't send full content in list view
      .lean()
      .sort({ published_date: -1 });

    return res.json({ blogs });
  } catch (error) {
    console.error('Fetch blogs error:', error);
    return res.status(500).json({ message: 'Unable to fetch blogs.' });
  }
});

// GET /blogs/:slug - Get a single blog by slug
router.get('/:slug', async function (req, res) {
  try {
    var slug = req.params.slug;
    var blog = await Blog.findOne({ slug: slug, is_published: true }).lean();

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    return res.json({ blog });
  } catch (error) {
    console.error('Fetch blog error:', error);
    return res.status(500).json({ message: 'Unable to fetch blog.' });
  }
});

module.exports = router;

