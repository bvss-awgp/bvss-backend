var mongoose = require('mongoose');

var contributionDetailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
    },
    gayatriPariwarDuration: {
      type: String,
      trim: true,
    },
    akhandJyotiMember: {
      type: String,
      trim: true,
    },
    guruDiksha: {
      type: String,
      trim: true,
    },
    missionBooksRead: {
      type: String,
      trim: true,
    },
    researchCategories: {
      type: [String],
      default: [],
    },
    hoursPerWeek: {
      type: String,
      trim: true,
    },
    consent: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      trim: true,
      default: 'contribution-form',
    },
    assignedTopic: {
      type: String,
      trim: true,
    },
    assignedTopicCode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'Contribution_detail',
  }
);

module.exports = mongoose.model('ContributionDetail', contributionDetailSchema);
