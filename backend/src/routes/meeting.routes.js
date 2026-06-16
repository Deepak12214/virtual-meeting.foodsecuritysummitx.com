const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Question = require('../models/Question');
const StageEngagement = require('../models/StageEngagement');
const { protectUser } = require('../middleware/auth');
const { createRoom, generateJoinToken, mapPlatformRoleToHMSRole } = require('../utils/hms');

// Helper: Save stage engagement statistics before a meeting is ended / completed
async function saveStageEngagementStats(meetingId) {
  try {
    const meeting = await Meeting.findById(meetingId).populate('participants');
    if (!meeting || !['main_stage', 'pitch'].includes(meeting.stageType)) {
      return;
    }

    // 1. Get live metrics segmenting by user role for Pitch Ceremony stage
    let viewersCount = 0;
    let stageCount = 0;

    if (meeting.stageType === 'pitch') {
      if (meeting.participants) {
        meeting.participants.forEach(p => {
          if (p.role === 'startup_participant') {
            stageCount++;
          } else {
            viewersCount++;
          }
        });
      }
    } else {
      viewersCount = meeting.participants ? meeting.participants.length : 0;
    }

    const totalQuestions = await Question.countDocuments({ meetingId });
    const approvedQuestions = await Question.countDocuments({ meetingId, status: 'approved' });

    // 2. Determine date (today at 00:00:00 local time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. Upsert and accumulate stats
    await StageEngagement.findOneAndUpdate(
      { date: today, stageType: meeting.stageType },
      {
        $inc: {
          viewersCount: viewersCount,
          stageCount: stageCount,
          totalQuestions: totalQuestions,
          approvedQuestions: approvedQuestions
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Analytics] Accumulated stage engagement for ${meeting.stageType}: +${viewersCount} viewers, +${stageCount} stage joiners, +${totalQuestions} questions`);
  } catch (error) {
    console.error('[Analytics] Error saving stage engagement stats:', error);
  }
}

// @desc    Create/Schedule a new meeting
// @route   POST /api/meetings
// @access  Private
router.post('/', protectUser, async (req, res) => {
  try {
    const { title, description, scheduledTime, duration } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Meeting title is required' });
    }

    // 1. Create room on 100ms.live
    let hmsRoom;
    try {
      hmsRoom = await createRoom(title, description);
    } catch (hmsError) {
      console.error('Failed to create room on 100ms:', hmsError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to provision video server room. Please try again.',
        error: hmsError.message 
      });
    }

    // 2. Create meeting in MongoDB
    const meeting = await Meeting.create({
      title,
      description: description || '',
      hmsRoomId: hmsRoom.id,
      scheduledTime: scheduledTime || new Date(),
      duration: duration || 30,
      creator: req.user._id,
      participants: [req.user._id]
    });

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private
router.get('/', protectUser, async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate('creator', 'name email role')
      .populate('participants', 'name email role')
      .sort({ scheduledTime: 1 });

    const now = new Date();
    for (let meeting of meetings) {
      const startTime = new Date(meeting.scheduledTime);
      const durationVal = meeting.duration || 30;
      const endTime = new Date(startTime.getTime() + durationVal * 60 * 1000);

      if (now >= endTime && meeting.status !== 'completed') {
        meeting.status = 'completed';
        await meeting.save();
        await saveStageEngagementStats(meeting._id);
        await Question.deleteMany({ meetingId: meeting._id });
      } else if (meeting.status === 'scheduled' && now >= startTime) {
        meeting.status = 'active';
        await meeting.save();
      }
    }

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get or create Main Stage meeting
// @route   GET /api/meetings/main-stage/room
// @access  Private
router.get('/main-stage/room', protectUser, async (req, res) => {
  try {
    let meeting = await Meeting.findOne({ stageType: 'main_stage' });

    if (!meeting) {
      meeting = await Meeting.findOne({ title: 'Main Stage Broadcast' });
      if (meeting) {
        meeting.stageType = 'main_stage';
        await meeting.save();
      }
    }

    if (meeting && meeting.status === 'scheduled') {
      const now = new Date();
      if (now >= new Date(meeting.scheduledTime)) {
        meeting.status = 'active';
        await meeting.save();
      }
    }

    if (!meeting) {
      let hmsRoom;
      try {
        hmsRoom = await createRoom('Main Stage Broadcast', 'Broadcasting stage for virtual event keynotes and presentations.');
      } catch (hmsError) {
        console.error('Failed to create Main Stage room on 100ms:', hmsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to provision Main Stage room.',
          error: hmsError.message
        });
      }

      meeting = await Meeting.create({
        title: 'Main Stage Broadcast',
        description: 'Broadcasting stage for virtual event keynotes and presentations.',
        stageType: 'main_stage',
        hmsRoomId: hmsRoom.id,
        scheduledTime: new Date(),
        duration: 480, // 8 hours
        creator: req.user._id,
        status: 'active',
        participants: [req.user._id]
      });
    }

    const populatedMeeting = await Meeting.findById(meeting._id).populate('creator', 'name email role');
    res.status(200).json({
      success: true,
      meeting: populatedMeeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get or create Startup Pitch Ceremony meeting
// @route   GET /api/meetings/pitch/room
// @access  Private
router.get('/pitch/room', protectUser, async (req, res) => {
  try {
    let meeting = await Meeting.findOne({ stageType: 'pitch' });

    if (!meeting) {
      meeting = await Meeting.findOne({ title: 'Startup Pitch Ceremony' });
      if (meeting) {
        meeting.stageType = 'pitch';
        await meeting.save();
      }
    }

    if (meeting && meeting.status === 'scheduled') {
      const now = new Date();
      if (now >= new Date(meeting.scheduledTime)) {
        meeting.status = 'active';
        await meeting.save();
      }
    }

    if (!meeting) {
      let hmsRoom;
      try {
        hmsRoom = await createRoom('Startup Pitch Ceremony', 'Broadcasting stage for startup pitches and investor panels.');
      } catch (hmsError) {
        console.error('Failed to create Pitch Stage room on 100ms:', hmsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to provision Pitch Stage room.',
          error: hmsError.message
        });
      }

      meeting = await Meeting.create({
        title: 'Startup Pitch Ceremony',
        description: 'Broadcasting stage for startup pitches and investor panels.',
        stageType: 'pitch',
        hmsRoomId: hmsRoom.id,
        scheduledTime: new Date(),
        duration: 480, // 8 hours
        creator: req.user._id,
        status: 'active',
        participants: [req.user._id]
      });
    }

    const populatedMeeting = await Meeting.findById(meeting._id).populate('creator', 'name email role');
    res.status(200).json({
      success: true,
      meeting: populatedMeeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get a single meeting by ID
// @route   GET /api/meetings/:id
// @access  Private
router.get('/:id', protectUser, async (req, res) => {
  try {
    let meeting = await Meeting.findById(req.id || req.params.id)
      .populate('creator', 'name email role')
      .populate('participants', 'name email role');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const now = new Date();
    const startTime = new Date(meeting.scheduledTime);
    const durationVal = meeting.duration || 30;
    const endTime = new Date(startTime.getTime() + durationVal * 60 * 1000);

    if (now >= endTime && meeting.status !== 'completed') {
      meeting.status = 'completed';
      await meeting.save();
      await saveStageEngagementStats(meeting._id);
      await Question.deleteMany({ meetingId: meeting._id });
    } else if (meeting.status === 'scheduled' && now >= startTime) {
      meeting.status = 'active';
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update meeting details (Organizer/Admin only)
// @route   PUT /api/meetings/:id
// @access  Private
router.put('/:id', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if user is organizer or admin
    if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this meeting' });
    }

    const { title, description, status, scheduledTime } = req.body;

    if (title !== undefined) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    
    if (status !== undefined) {
      if (status === 'active' && meeting.status !== 'active' && scheduledTime === undefined) {
        meeting.scheduledTime = new Date();
      }
      meeting.status = status;
      if (status === 'completed') {
        await saveStageEngagementStats(meeting._id);
        await Question.deleteMany({ meetingId: meeting._id });
      }
    }
    
    if (scheduledTime !== undefined) meeting.scheduledTime = scheduledTime;

    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Generate a secure Join Token for a meeting
// @route   POST /api/meetings/:id/token
// @access  Private
router.post('/:id/token', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // 1. Determine hmsRole: Only the creator of the meeting gets 'broadcaster' role
    let hmsRole;
    if (meeting.creator.toString() === req.user._id.toString()) {
      hmsRole = 'broadcaster';
    } else {
      hmsRole = 'viewer-on-stage';
    }

    // 2. Generate join token
    const token = generateJoinToken(meeting.hmsRoomId, req.user._id, hmsRole);

    res.status(200).json({
      success: true,
      token,
      hmsRoomId: meeting.hmsRoomId,
      role: hmsRole
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Join a meeting (registers user as participant in DB)
// @route   POST /api/meetings/:id/join
// @access  Private
router.post('/:id/join', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Add user to participants if not already present
    if (!meeting.participants.includes(req.user._id)) {
      meeting.participants.push(req.user._id);
      if (meeting.status === 'scheduled') {
        meeting.status = 'active';
        meeting.scheduledTime = new Date();
      }
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      message: 'Joined meeting successfully',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    End a meeting (sets status to completed)
// @route   POST /api/meetings/:id/end
// @access  Private
router.post('/:id/end', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Only creator, admin, or organizer can end meetings in DB
    const isAuthorized = 
      meeting.creator.toString() === req.user._id.toString() || 
      req.user.role === 'admin' || 
      req.user.role === 'organizer';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to end this meeting' });
    }

    meeting.status = 'completed';
    await meeting.save();
    await saveStageEngagementStats(meeting._id);
    await Question.deleteMany({ meetingId: meeting._id });

    res.status(200).json({
      success: true,
      message: 'Meeting ended successfully',
      meeting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Submit a join request to the lobby waiting room
// @route   POST /api/meetings/:id/lobby/request
// @access  Private
router.post('/:id/lobby/request', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { peerId } = req.body;
    if (!peerId) {
      return res.status(400).json({ success: false, message: 'peerId is required' });
    }

    // Check if user already has a request
    const existingIndex = meeting.lobbyRequests.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      meeting.lobbyRequests[existingIndex].peerId = peerId;
      meeting.lobbyRequests[existingIndex].status = 'pending';
      meeting.lobbyRequests[existingIndex].requestedAt = new Date();
    } else {
      meeting.lobbyRequests.push({
        user: req.user._id,
        peerId,
        status: 'pending'
      });
    }

    await meeting.save();
    res.status(200).json({ success: true, message: 'Join request submitted to lobby' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get current user's join request status in the lobby
// @route   GET /api/meetings/:id/lobby/status
// @access  Private
router.get('/:id/lobby/status', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const request = meeting.lobbyRequests.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    res.status(200).json({
      success: true,
      status: request ? request.status : 'none',
      peerId: request ? request.peerId : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get all pending lobby requests (Organizer only)
// @route   GET /api/meetings/:id/lobby/requests
// @access  Private
router.get('/:id/lobby/requests', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('lobbyRequests.user', 'name email role');
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const isAuthorized = 
      meeting.creator.toString() === req.user._id.toString() || 
      req.user.role === 'admin' || 
      req.user.role === 'organizer';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to view waitlist requests' });
    }

    const pendingRequests = meeting.lobbyRequests.filter(r => r.status === 'pending');

    res.status(200).json({
      success: true,
      requests: pendingRequests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Admit a participant from the lobby (Organizer only)
// @route   POST /api/meetings/:id/lobby/admit
// @access  Private
router.post('/:id/lobby/admit', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const isAuthorized = 
      meeting.creator.toString() === req.user._id.toString() || 
      req.user.role === 'admin' || 
      req.user.role === 'organizer';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage lobby requests' });
    }

    const { userId } = req.body;
    const request = meeting.lobbyRequests.find(r => r.user.toString() === userId.toString());

    if (!request) {
      return res.status(404).json({ success: false, message: 'Lobby request not found' });
    }

    request.status = 'approved';

    if (!meeting.participants.includes(userId)) {
      meeting.participants.push(userId);
    }
    
    if (meeting.status === 'scheduled') {
      meeting.status = 'active';
    }

    await meeting.save();
    res.status(200).json({ success: true, message: 'Participant admitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Deny entry to a participant from the lobby (Organizer only)
// @route   POST /api/meetings/:id/lobby/deny
// @access  Private
router.post('/:id/lobby/deny', protectUser, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const isAuthorized = 
      meeting.creator.toString() === req.user._id.toString() || 
      req.user.role === 'admin' || 
      req.user.role === 'organizer';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage lobby requests' });
    }

    const { userId } = req.body;
    const request = meeting.lobbyRequests.find(r => r.user.toString() === userId.toString());

    if (!request) {
      return res.status(404).json({ success: false, message: 'Lobby request not found' });
    }

    request.status = 'rejected';

    await meeting.save();
    res.status(200).json({ success: true, message: 'Participant request denied successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
