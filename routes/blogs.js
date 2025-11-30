var express = require('express');
var Blog = require('../models/Blog');
var BlogLike = require('../models/BlogLike');
var BlogComment = require('../models/BlogComment');
var requireAdmin = require('../middleware/adminAuth');
var requireAuth = require('../middleware/auth');

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

// POST /blogs/:slug/like - Like a blog (requires auth)
router.post('/:slug/like', requireAuth, async function (req, res) {
  try {
    console.log('📥 POST /blogs/:slug/like - Request received');
    var slug = req.params.slug;
    var userId = req.auth.userId;
    
    console.log('Slug:', slug);
    console.log('User ID:', userId);

    var blog = await Blog.findOne({ slug: slug, is_published: true });
    if (!blog) {
      console.log('❌ Blog not found for slug:', slug);
      return res.status(404).json({ message: 'Blog not found.' });
    }

    console.log('✅ Blog found:', blog._id, blog.title);

    // Check if user already liked this blog
    var existingLike = await BlogLike.findOne({ blog: blog._id, user: userId });
    if (existingLike) {
      console.log('⚠️ User already liked this blog');
      return res.status(400).json({ message: 'Blog already liked.' });
    }

    // Create like
    var like = await BlogLike.create({
      blog: blog._id,
      user: userId,
    });

    console.log('✅ Like created successfully:', like._id);

    return res.json({ message: 'Blog liked successfully.' });
  } catch (error) {
    console.error('❌ Like blog error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Blog already liked.' });
    }
    return res.status(500).json({ message: 'Unable to like blog.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// DELETE /blogs/:slug/like - Unlike a blog (requires auth)
router.delete('/:slug/like', requireAuth, async function (req, res) {
  try {
    console.log('📥 DELETE /blogs/:slug/like - Request received');
    var slug = req.params.slug;
    var userId = req.auth.userId;
    
    console.log('Slug:', slug);
    console.log('User ID:', userId);

    var blog = await Blog.findOne({ slug: slug, is_published: true });
    if (!blog) {
      console.log('❌ Blog not found for slug:', slug);
      return res.status(404).json({ message: 'Blog not found.' });
    }

    console.log('✅ Blog found:', blog._id, blog.title);

    // Remove like
    var result = await BlogLike.deleteOne({ blog: blog._id, user: userId });
    
    console.log('Delete result:', result);
    
    if (result.deletedCount === 0) {
      console.log('⚠️ Like not found for deletion');
      return res.status(404).json({ message: 'Like not found.' });
    }

    console.log('✅ Like deleted successfully');

    return res.json({ message: 'Blog unliked successfully.' });
  } catch (error) {
    console.error('❌ Unlike blog error:', error);
    return res.status(500).json({ message: 'Unable to unlike blog.', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// GET /blogs/:slug/comments - Get comments for a blog
router.get('/:slug/comments', async function (req, res) {
  try {
    var slug = req.params.slug;
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var skip = (page - 1) * limit;

    var blog = await Blog.findOne({ slug: slug, is_published: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    var comments = await BlogComment.find({ blog: blog._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    var totalComments = await BlogComment.countDocuments({ blog: blog._id });

    return res.json({
      comments: comments.map(function(comment) {
        return {
          id: comment._id,
          userName: comment.userName,
          content: comment.content,
          createdAt: comment.createdAt,
        };
      }),
      pagination: {
        page: page,
        limit: limit,
        total: totalComments,
        pages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return res.status(500).json({ message: 'Unable to fetch comments.' });
  }
});

// POST /blogs/:slug/comments - Post a comment (requires auth)
router.post('/:slug/comments', requireAuth, async function (req, res) {
  try {
    var slug = req.params.slug;
    var userId = req.auth.userId;
    var content = req.body.content;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({ message: 'Comment must be 1000 characters or less.' });
    }

    var blog = await Blog.findOne({ slug: slug, is_published: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    // Get user email for userName
    var User = require('../models/User');
    var user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Extract name from email (before @) or use email
    var userName = user.email.split('@')[0];

    // Create comment
    var comment = await BlogComment.create({
      blog: blog._id,
      user: userId,
      userName: userName,
      content: content.trim(),
    });

    return res.status(201).json({
      comment: {
        id: comment._id,
        userName: comment.userName,
        content: comment.content,
        createdAt: comment.createdAt,
      },
      message: 'Comment posted successfully.',
    });
  } catch (error) {
    console.error('Post comment error:', error);
    return res.status(500).json({ message: 'Unable to post comment.' });
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

    // Get like count
    var likeCount = await BlogLike.countDocuments({ blog: blog._id });

    // Get comment count
    var commentCount = await BlogComment.countDocuments({ blog: blog._id });

    // Check if user liked this blog (if authenticated)
    var userLiked = false;
    var authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        var jwt = require('jsonwebtoken');
        var User = require('../models/User');
        var token = authHeader.substring(7).trim();
        var jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
          var payload = jwt.verify(token, jwtSecret);
          if (payload && payload.sub) {
            var existingLike = await BlogLike.findOne({ blog: blog._id, user: payload.sub });
            userLiked = !!existingLike;
          }
        }
      } catch (authError) {
        // If auth fails, just continue without userLiked
        console.log('Auth check failed (non-critical):', authError.message);
      }
    }

    // Add like count, comment count, and userLiked to blog object
    blog.likeCount = likeCount;
    blog.commentCount = commentCount;
    blog.userLiked = userLiked;

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

