var express = require('express');
var Blog = require('../models/Blog');
var requireAdmin = require('../middleware/adminAuth');

var router = express.Router();

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

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

// POST /blogs - Create a new blog (Admin only)
router.post('/', requireAdmin, async function (req, res) {
  try {
    var body = req.body || {};
    var title = body.title;
    var excerpt = body.excerpt;
    var content = body.content;
    var cover_image_url = body.cover_image_url;
    var category = body.category || 'Research';
    var author = body.author || 'Research Team';
    var is_published = body.is_published !== undefined ? body.is_published : true;
    var read_time_minutes = body.read_time_minutes;

    // Validate required fields
    if (!title || !excerpt || !content || !cover_image_url) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, excerpt, content, and cover_image_url are required.' 
      });
    }

    // Generate slug from title
    var baseSlug = generateSlug(title);
    var slug = baseSlug;
    
    // Ensure slug is unique
    var counter = 1;
    while (await Blog.findOne({ slug: slug })) {
      slug = baseSlug + '-' + counter;
      counter++;
    }

    // Calculate read time if not provided (rough estimate: 200 words per minute)
    if (!read_time_minutes) {
      var wordCount = content.split(/\s+/).length;
      read_time_minutes = Math.max(1, Math.ceil(wordCount / 200));
    }

    // Create blog
    var blog = await Blog.create({
      title: title.trim(),
      slug: slug,
      excerpt: excerpt.trim(),
      content: content.trim(),
      cover_image_url: cover_image_url.trim(),
      category: category.trim(),
      author: author.trim(),
      is_published: is_published,
      read_time_minutes: read_time_minutes,
      published_date: new Date(),
    });

    return res.status(201).json({
      blog: blog.toObject(),
      message: 'Blog created successfully.',
    });
  } catch (error) {
    console.error('Create blog error:', error);
    
    // Handle duplicate slug error
    if (error.code === 11000 || error.message.includes('duplicate')) {
      return res.status(409).json({ message: 'A blog with this title already exists.' });
    }
    
    return res.status(500).json({ message: 'Unable to create blog.' });
  }
});

// PUT /blogs/:id - Update a blog (Admin only)
router.put('/:id', requireAdmin, async function (req, res) {
  try {
    var blogId = req.params.id;
    var body = req.body || {};
    
    var updateData = {};
    if (body.title !== undefined) {
      updateData.title = body.title.trim();
      // Regenerate slug if title changed
      var baseSlug = generateSlug(body.title);
      var slug = baseSlug;
      var counter = 1;
      while (await Blog.findOne({ slug: slug, _id: { $ne: blogId } })) {
        slug = baseSlug + '-' + counter;
        counter++;
      }
      updateData.slug = slug;
    }
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt.trim();
    if (body.content !== undefined) {
      updateData.content = body.content.trim();
      // Recalculate read time if content changed
      if (!body.read_time_minutes) {
        var wordCount = body.content.split(/\s+/).length;
        updateData.read_time_minutes = Math.max(1, Math.ceil(wordCount / 200));
      }
    }
    if (body.cover_image_url !== undefined) updateData.cover_image_url = body.cover_image_url.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.author !== undefined) updateData.author = body.author.trim();
    if (body.is_published !== undefined) updateData.is_published = body.is_published;
    if (body.read_time_minutes !== undefined) updateData.read_time_minutes = body.read_time_minutes;

    var blog = await Blog.findByIdAndUpdate(
      blogId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    return res.json({
      blog: blog.toObject(),
      message: 'Blog updated successfully.',
    });
  } catch (error) {
    console.error('Update blog error:', error);
    return res.status(500).json({ message: 'Unable to update blog.' });
  }
});

// DELETE /blogs/:id - Delete a blog (Admin only)
router.delete('/:id', requireAdmin, async function (req, res) {
  try {
    var blogId = req.params.id;
    var blog = await Blog.findByIdAndDelete(blogId);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    return res.json({ message: 'Blog deleted successfully.' });
  } catch (error) {
    console.error('Delete blog error:', error);
    return res.status(500).json({ message: 'Unable to delete blog.' });
  }
});

module.exports = router;

