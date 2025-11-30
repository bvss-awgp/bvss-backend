var mongoose = require('mongoose');

var blogLikeSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
    collection: 'blog_likes',
  }
);

// Ensure a user can only like a blog once
blogLikeSchema.index({ blog: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('BlogLike', blogLikeSchema);

