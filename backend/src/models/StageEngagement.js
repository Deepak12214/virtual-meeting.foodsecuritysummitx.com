const mongoose = require('mongoose');

const stageEngagementSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    stageType: {
      type: String,
      required: true,
      enum: ['main_stage', 'pitch']
    },
    viewersCount: {
      type: Number,
      required: true,
      default: 0
    },
    stageCount: {
      type: Number,
      required: true,
      default: 0
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 0
    },
    approvedQuestions: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { timestamps: true }
);

// Create a unique index for date and stageType to accumulate stats daily
stageEngagementSchema.index({ date: 1, stageType: 1 }, { unique: true });

module.exports = mongoose.model('StageEngagement', stageEngagementSchema);
