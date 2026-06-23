const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protectUser } = require('../middleware/auth');

// ─── Middleware: Only admins and organizers ───────────────────────────────────
const requireAdminOrOrganizer = (req, res, next) => {
  if (!['admin', 'organizer'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Organizer role required.',
    });
  }
  next();
};

// @desc    Get all users with optional filters
// @route   GET /api/admin/users
// @access  Admin / Organizer
router.get('/users', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 50 } = req.query;

    const query = {};

    // Filter by approval status
    if (status === 'pending') query.isApproved = false;
    else if (status === 'approved') query.isApproved = true;

    // Filter by role
    if (role && role !== 'all') query.role = role;

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -verifyToken -verifyTokenExpiry')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Stats
    const [pendingCount, approvedCount, totalCount] = await Promise.all([
      User.countDocuments({ isApproved: false }),
      User.countDocuments({ isApproved: true }),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        total: totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Approve a user
// @route   PATCH /api/admin/users/:id/approve
// @access  Admin / Organizer
router.patch('/users/:id/approve', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Cannot approve yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot modify your own approval status' });
    }

    user.isApproved = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} has been approved`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Reject / revoke approval for a user
// @route   PATCH /api/admin/users/:id/reject
// @access  Admin / Organizer
router.patch('/users/:id/reject', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot modify your own approval status' });
    }

    user.isApproved = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name}'s access has been revoked`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Change a user's role
// @route   PATCH /api/admin/users/:id/role
// @access  Admin only
router.patch('/users/:id/role', protectUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can change user roles' });
    }

    const { role } = req.body;
    const validRoles = ['admin', 'organizer', 'speaker', 'exhibitor', 'startup_participant', 'sponsor', 'attendee', 'host', 'moderator'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name}'s role changed to ${role}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Deactivate / reactivate a user account
// @route   PATCH /api/admin/users/:id/toggle-active
// @access  Admin only
router.patch('/users/:id/toggle-active', protectUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can deactivate users' });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} is now ${user.isActive ? 'active' : 'deactivated'}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete a user permanently
// @route   DELETE /api/admin/users/:id
// @access  Admin only
router.delete('/users/:id', protectUser, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete users' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete yourself' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `User ${user.name} has been permanently deleted`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
