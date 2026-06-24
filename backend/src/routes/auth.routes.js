const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const { protectUser } = require('../middleware/auth');
const { ALL_ROLES, AUTO_APPROVE_ROLES, USER_ROLES } = require('../constants/roles');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @desc    Register User & Send OTP
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, company } = req.body;
    const finalRole = role || USER_ROLES.ATTENDEE;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, phone and password' });
    }

    if (!ALL_ROLES.includes(finalRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    const userExists = await User.findOne({ email });
    
    // Check if roles require approval
    const isApproved = AUTO_APPROVE_ROLES.includes(finalRole);


    if (userExists) {
      if (userExists.authProvider === 'google') {
        return res.status(400).json({ success: false, message: 'This email is already registered with Google. Please use Google Sign-In.' });
      }
      if (userExists.isVerified) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
      } else {
        // User exists but not verified - update fields and resend OTP
        userExists.name = name;
        userExists.phone = phone;
        userExists.password = password;
        userExists.role = finalRole;
        userExists.company = company || '';
        userExists.isApproved = isApproved;
        await userExists.save();

        await sendEmail({ email, emailType: "VERIFY", userId: userExists._id });
        return res.status(200).json({ success: true, requiresOTP: true, message: 'OTP sent to your email.' });
      }
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: finalRole,
      company: company || '',
      isVerified: false,
      isApproved,
    });
    
    // Send verification email
    await sendEmail({ email, emailType: "VERIFY", userId: user._id })
        .catch(err => console.error("Email send error:", err));

    res.status(201).json({
      success: true,
      requiresOTP: true,
      message: 'OTP sent to your email. Please verify.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Verify OTP for Registration or Login
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ 
      email, 
      verifyToken: otp,
      verifyTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({ success: false, message: 'This email is registered with Google. Please use Google Sign-In.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      // Auto-resend OTP
      await sendEmail({ email, emailType: "VERIFY", userId: user._id });
      return res.status(403).json({ success: false, requiresOTP: true, message: 'Please verify your email to login. A new OTP has been sent.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Forgot Password - Request Reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    await sendEmail({ email, emailType: "RESET", userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset OTP has been sent to your email.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Reset Password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, otp, and newPassword' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ 
      email, 
      verifyToken: otp,
      verifyTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protectUser, async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      company: req.user.company,
      isApproved: req.user.isApproved,
      createdAt: req.user.createdAt,
    },
  });
});

// @desc    Google Sign-In / Sign-Up
// @route   POST /api/auth/google-login
// @access  Public
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, phone, role, company } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Please provide email and name' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (user.authProvider === 'local') {
        return res.status(400).json({ success: false, message: 'This email is already registered with standard email and password. Please log in with password.' });
      }
      // User exists and is registered via Google
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
      }
      
      const token = generateToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          company: user.company || '',
          isApproved: user.isApproved,
          createdAt: user.createdAt,
        },
      });
    } else {
      // Create new user with authProvider = 'google'
      const finalRole = role || USER_ROLES.ATTENDEE;
      if (!ALL_ROLES.includes(finalRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role provided' });
      }

      const isApproved = AUTO_APPROVE_ROLES.includes(finalRole);

      // Generate a random dummy password because schema requires it
      const dummyPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      user = await User.create({
        name,
        email,
        phone: phone || 'N/A', // user might not have phone via Google auth
        password: dummyPassword,
        role: finalRole,
        company: company || '',
        isVerified: true, // Google accounts are pre-verified
        isApproved,
        authProvider: 'google',
      });

      const token = generateToken(user._id);
      return res.status(201).json({
        success: true,
        message: 'Registration and login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          company: user.company,
          isApproved: user.isApproved,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
