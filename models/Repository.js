var mongoose = require('mongoose');

var repositorySchema = new mongoose.Schema(
  {
    topicName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Complete', 'Incomplete'],
      default: 'Incomplete',
    },
  },
  {
    timestamps: true,
    collection: 'Repository',
  }
);

module.exports = mongoose.model('Repository', repositorySchema);

