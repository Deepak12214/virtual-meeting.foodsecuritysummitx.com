const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALL_ROLES, USER_ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ALL_ROLES,
      default: USER_ROLES.ATTENDEE,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    verifyToken: String,
    verifyTokenExpiry: Date,
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
