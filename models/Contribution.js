var mongoose = require('mongoose');

var contributionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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
  },
  {
    timestamps: true,
    collection: 'user_contributions',
  }
);

contributionSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    phone: this.phone,
    gender: this.gender,
    gayatriPariwarDuration: this.gayatriPariwarDuration,
    akhandJyotiMember: this.akhandJyotiMember,
    guruDiksha: this.guruDiksha,
    missionBooksRead: this.missionBooksRead,
    researchCategories: this.researchCategories,
    hoursPerWeek: this.hoursPerWeek,
    consent: this.consent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Contribution', contributionSchema);
