var mongoose = require('mongoose');

var blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    cover_image_url: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      default: 'Research Team',
      trim: true,
    },
    category: {
      type: String,
      default: 'Research',
      trim: true,
    },
    published_date: {
      type: Date,
      default: Date.now,
    },
    read_time_minutes: {
      type: Number,
      default: 5,
    },
    is_published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'blogs',
  }
);

module.exports = mongoose.model('Blog', blogSchema);

