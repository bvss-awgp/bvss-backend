var mongoose = require('mongoose');

var blogCommentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'blog_comments',
  }
);

// Index for faster queries
blogCommentSchema.index({ blog: 1, createdAt: -1 });

module.exports = mongoose.model('BlogComment', blogCommentSchema);

