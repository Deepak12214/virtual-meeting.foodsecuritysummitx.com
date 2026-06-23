const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Meeting ID is required'],
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question text cannot exceed 500 characters'],
    },
    askedBy: {
      type: String,
      required: [true, 'Name of person asking is required'],
    },
    askedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID of person asking is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminApproved: {
      type: Boolean,
      default: false,
    },
    hostApproved: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index to automatically delete pending questions after 2 minutes
questionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

questionSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

questionSchema.set('toJSON', { virtuals: true });
questionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Question', questionSchema);
