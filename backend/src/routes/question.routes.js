const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Meeting = require('../models/Meeting');
const { protectUser } = require('../middleware/auth');
const { USER_ROLES, ADMIN_LEVEL_ROLES } = require('../constants/roles');

// @desc    Submit a question
// @route   POST /api/questions
// @access  Private
router.post('/', protectUser, async (req, res) => {
  try {
    const { meetingId, text } = req.body;

    if (!meetingId || !text) {
      return res.status(400).json({ success: false, message: 'Meeting ID and text are required' });
    }

    // Check if meeting exists and is active or scheduled
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (meeting.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot ask questions on a while stage is offline' });
    }

    // Cooldown check: 2 minutes limit per user
    const cooldownTime = 2 * 60 * 1000; // 2 minutes
    const lastQuestion = await Question.findOne({
      askedById: req.user._id,
      meetingId,
      createdAt: { $gt: new Date(Date.now() - cooldownTime) }
    });

    if (lastQuestion) {
      const timeElapsed = Date.now() - lastQuestion.createdAt.getTime();
      const timeLeft = Math.ceil((cooldownTime - timeElapsed) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${timeLeft} seconds before asking another question.`,
        timeLeftSeconds: timeLeft
      });
    }

    // Create question with expiresAt (2 minutes from now)
    const expiresAt = new Date(Date.now() + cooldownTime);
    const question = await Question.create({
      meetingId,
      text,
      askedBy: req.user.name,
      askedById: req.user._id,
      status: 'pending',
      expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'Question submitted successfully and is pending approval',
      question
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get questions for a meeting
// @route   GET /api/questions
// @access  Private
router.get('/', protectUser, async (req, res) => {
  try {
    const { meetingId } = req.query;
    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Meeting ID query parameter is required' });
    }

    const isAdminOrHost = [USER_ROLES.ADMIN, USER_ROLES.ORGANIZER, USER_ROLES.HOST].includes(req.user.role);
    const isModerator = req.user.role === USER_ROLES.MODERATOR;

    let query = { meetingId };
    if (isAdminOrHost) {
      // Admin/Host/Organizer sees all questions
    } else if (isModerator) {
      // Moderator only sees questions approved by both Admin and Host
      query.adminApproved = true;
      query.hostApproved = true;
      query.status = { $ne: 'rejected' };
    } else {
      // Normal attendees and other roles only see their own questions
      query.askedById = req.user._id;
    }

    const questions = await Question.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Approve a question
// @route   PUT /api/questions/:id/approve
// @access  Private
router.put('/:id/approve', protectUser, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (req.user.role === USER_ROLES.ADMIN) {
      question.adminApproved = true;
      if (question.hostApproved) {
        question.status = 'approved';
        question.expiresAt = undefined;
      }
      await question.save();
      return res.status(200).json({
        success: true,
        message: 'Question approved by Admin',
        question
      });
    }

    if ([USER_ROLES.HOST, USER_ROLES.ORGANIZER].includes(req.user.role)) {
      if (!question.adminApproved) {
        return res.status(400).json({ success: false, message: 'Question must be approved by Admin first' });
      }
      question.hostApproved = true;
      question.status = 'approved';
      question.expiresAt = undefined;
      await question.save();
      return res.status(200).json({
        success: true,
        message: 'Question approved by Host',
        question
      });
    }

    return res.status(403).json({ success: false, message: 'Not authorized to moderate questions' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Reject / Delete a question
// @route   DELETE /api/questions/:id
// @access  Private
router.delete('/:id', protectUser, async (req, res) => {
  try {
    if (!ADMIN_LEVEL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to moderate questions' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    question.status = 'rejected';
    // Keep in DB for 2 minutes so user can see it was rejected, then TTL deletes it
    question.expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await question.save();

    res.status(200).json({
      success: true,
      message: 'Question rejected successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
