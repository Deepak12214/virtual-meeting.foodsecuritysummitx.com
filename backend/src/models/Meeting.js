const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    stageType: {
      type: String,
      enum: ['none', 'main_stage', 'pitch'],
      default: 'none',
    },
    hmsRoomId: {
      type: String,
      required: [true, 'HMS Room ID is required'],
      unique: true,
    },
    scheduledTime: {
      type: Date,
      required: [true, 'Scheduled time is required'],
      default: Date.now,
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      default: 30,
    },
    status: {
      type: String,
      enum: ['active', 'scheduled', 'completed'],
      default: 'scheduled',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    invitedEmails: [
      {
        type: String,
        lowercase: true,
        trim: true,
      }
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    lobbyRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        peerId: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Meeting', meetingSchema);
