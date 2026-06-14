const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Booth name is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['sponsor', 'exhibitor'],
    },
    tier: {
      type: String,
      enum: ['platinum', 'gold', 'silver'],
    },
    logo: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    brochures: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true }
      }
    ],
    representatives: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isLive: {
      type: Boolean,
      default: false,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    },
    leads: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        action: {
          type: String,
          required: true,
          enum: ['join_meeting', 'download_brochure']
        },
        details: {
          type: String,
          default: ''
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

boothSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

boothSchema.set('toJSON', { virtuals: true });
boothSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booth', boothSchema);
