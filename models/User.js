var mongoose = require('mongoose');

var userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'users_credentials',
  }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    email: this.email,
    isAdmin: this.isAdmin || false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);

