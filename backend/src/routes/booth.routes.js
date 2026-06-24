const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Booth = require('../models/Booth');
const BoothMeeting = require('../models/BoothMeeting');
const User = require('../models/User');
const { protectUser } = require('../middleware/auth');
const { createRoom, generateJoinToken } = require('../utils/hms');
const { USER_ROLES, BOOTH_MANAGER_ROLES } = require('../constants/roles');

// ─── Multer File Upload Configuration ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

// @desc    Generic upload endpoint for images (logos) and PDFs (brochures)
// @route   POST /api/booths/upload-file
// @access  Private
router.post('/upload-file', protectUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, message: 'File uploaded successfully', url: relativeUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// ─── Helper function to verify representative status ─────────────────────────
const isRepresentative = (booth, user) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;

  const isLinked = booth.representatives && booth.representatives.some(
    (r) => r.toString() === user._id.toString()
  );
  if (isLinked) return true;

  if (user.company && user.company.trim().toLowerCase() === booth.name.trim().toLowerCase()) {
    return true;
  }

  if ((user.role === USER_ROLES.EXHIBITOR || user.role === USER_ROLES.SPONSOR || user.role === USER_ROLES.SUB_EXHIBITOR) &&
    user.company && user.company.trim().toLowerCase() === booth.name.trim().toLowerCase()) {
    return true;
  }

  return false;
};

// Seed initial booth data matching frontend mock data
const seedBooths = async () => {
  const count = await Booth.countDocuments();
  if (count === 0) {
    const initialBooths = [
      {
        name: 'Global Tech Corp',
        category: 'sponsor',
        tier: 'platinum',
        logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
        description: 'Leading provider of enterprise cloud solutions and digital transformation services. Visit our booth to learn about our latest innovations.',
        brochures: [
          { name: 'Product Catalog 2026', url: '/uploads/product_catalog_placeholder.pdf' },
          { name: 'Case Studies', url: '/uploads/case_studies_placeholder.pdf' },
        ],
        isLive: false,
        visitCount: 234
      },
      {
        name: 'InnovateLab Technologies',
        category: 'sponsor',
        tier: 'gold',
        logo: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=200&fit=crop',
        description: 'AI-powered analytics and business intelligence platform helping companies make data-driven decisions.',
        brochures: [
          { name: 'Platform Overview', url: '/uploads/platform_overview_placeholder.pdf' },
          { name: 'Pricing Guide', url: '/uploads/pricing_guide_placeholder.pdf' },
        ],
        isLive: false,
        visitCount: 156
      },
      {
        name: 'CloudScale Systems',
        category: 'sponsor',
        tier: 'silver',
        logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop',
        description: 'Infrastructure as a Service provider with global reach and 99.99% uptime guarantee.',
        brochures: [
          { name: 'Infrastructure Solutions', url: '/uploads/infrastructure_solutions_placeholder.pdf' },
        ],
        isLive: false,
        visitCount: 89
      },
      {
        name: 'SecureNet Solutions',
        category: 'exhibitor',
        logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&h=200&fit=crop',
        description: 'Cybersecurity solutions for modern enterprises. Protecting your digital assets 24/7.',
        brochures: [
          { name: 'Security Assessment', url: '/uploads/security_assessment_placeholder.pdf' },
        ],
        isLive: false,
        visitCount: 67
      },
      {
        name: 'DataFlow Analytics',
        category: 'exhibitor',
        logo: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&h=200&fit=crop',
        description: 'Real-time data processing and analytics platform for enterprise applications.',
        brochures: [
          { name: 'Technical Whitepaper', url: '/uploads/technical_whitepaper_placeholder.pdf' },
          { name: 'Demo Guide', url: '/uploads/demo_guide_placeholder.pdf' },
        ],
        isLive: false,
        visitCount: 45
      }
    ];

    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const sampleFiles = [
      'product_catalog_placeholder.pdf',
      'case_studies_placeholder.pdf',
      'platform_overview_placeholder.pdf',
      'pricing_guide_placeholder.pdf',
      'infrastructure_solutions_placeholder.pdf',
      'security_assessment_placeholder.pdf',
      'technical_whitepaper_placeholder.pdf',
      'demo_guide_placeholder.pdf'
    ];
    sampleFiles.forEach(file => {
      const filePath = path.join(uploadDir, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '%PDF-1.4 Mock Brochure Content');
      }
    });

    await Booth.create(initialBooths);
    console.log('🌱 Successfully seeded initial booths in MongoDB');
  }
};

// ─── API Routes ──────────────────────────────────────────────────────────────

// @desc    Get all booths
// @route   GET /api/booths
// @access  Private
router.get('/', protectUser, async (req, res) => {
  try {
    const booths = await Booth.find().populate('meeting');
    res.status(200).json({ success: true, count: booths.length, booths });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create a new Booth (Custom booth)
// @route   POST /api/booths
// @access  Private (Admins, Exhibitors, Sponsors)
router.post('/', protectUser, async (req, res) => {
  try {
    const { name, category, tier, logo, description, brochures } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Please provide name and category' });
    }

    const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.EXHIBITOR];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only admins or exhibitors can create booths' });
    }

    // Check if user already represents/created an active booth (except admin)
    if (req.user.role !== USER_ROLES.ADMIN) {
      const userHasBooth = await Booth.findOne({ representatives: req.user._id });
      if (userHasBooth) {
        return res.status(400).json({
          success: false,
          message: 'You already represent a booth. Only one booth per representative is allowed.'
        });
      }
    }

    const existingBooth = await Booth.findOne({ name });
    if (existingBooth) {
      return res.status(400).json({ success: false, message: 'Booth name already registered' });
    }

    // Default logo if not provided
    const finalLogo = logo || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop';

    const booth = await Booth.create({
      name,
      category,
      tier: category === 'sponsor' ? (tier || 'silver') : undefined,
      logo: finalLogo,
      description: description || '',
      brochures: brochures || [],
      representatives: [req.user._id],
      isLive: false,
      visitCount: 0
    });

    res.status(201).json({ success: true, message: 'Booth created successfully', booth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Claim booth representative rights
// @route   POST /api/booths/:id/claim
// @access  Private (Exhibitors, Sponsors)
router.post('/:id/claim', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    const allowedRoles = [USER_ROLES.EXHIBITOR, USER_ROLES.SPONSOR, USER_ROLES.ADMIN, USER_ROLES.SUB_EXHIBITOR];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only exhibitors, sponsors, sub-exhibitors, or admins can claim representative rights' });
    }

    if ([USER_ROLES.SUB_EXHIBITOR, USER_ROLES.EXHIBITOR].includes(req.user.role) && req.user.role !== USER_ROLES.ADMIN) {
      if (!req.user.company || req.user.company.trim().toLowerCase() !== booth.name.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'You can only claim representative rights for a booth matching your company name' });
      }
    }

    // Prevent duplicate association
    if (booth.representatives.includes(req.user._id)) {
      return res.status(200).json({ success: true, message: 'You are already a representative of this booth', booth });
    }

    // Check if user already represents another booth (except admin)
    if (req.user.role !== USER_ROLES.ADMIN) {
      const userHasBooth = await Booth.findOne({ representatives: req.user._id });
      if (userHasBooth && userHasBooth._id.toString() !== booth._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You already represent another booth. Only one booth per representative is allowed.'
        });
      }
    }

    // Associate
    booth.representatives.push(req.user._id);
    await booth.save();

    res.status(200).json({ success: true, message: 'Successfully registered as a representative of this booth', booth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get a single booth by ID
// @route   GET /api/booths/:id
// @access  Private
router.get('/:id', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id)
      .populate('meeting')
      .populate('representatives', 'name email role company');

    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    const meetings = await BoothMeeting.find({ booth: booth._id })
      .populate('creator', 'name email role')
      .sort({ createdAt: -1 });

    const boothObj = booth.toObject();
    boothObj.meetings = meetings;

    res.status(200).json({ success: true, booth: boothObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update booth description and brochures
// @route   PUT /api/booths/:id
// @access  Private
router.put('/:id', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    if (!isRepresentative(booth, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this booth' });
    }

    const { name, logo, description, brochures } = req.body;

    if (name !== undefined && name !== booth.name) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'Booth name cannot be empty' });
      }
      const existingBooth = await Booth.findOne({ name: name.trim() });
      if (existingBooth) {
        return res.status(400).json({ success: false, message: 'Booth name already registered' });
      }
      booth.name = name.trim();
    }
    if (logo !== undefined) booth.logo = logo;
    if (description !== undefined) booth.description = description;
    if (brochures !== undefined) {
      if (brochures.length > 3) {
        return res.status(400).json({ success: false, message: 'Maximum of 3 brochures allowed' });
      }
      booth.brochures = brochures;
    }

    await booth.save();
    res.status(200).json({ success: true, message: 'Booth updated successfully', booth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Upload brochure PDF file
// @route   POST /api/booths/:id/upload
// @access  Private
router.post('/:id/upload', protectUser, upload.single('brochure'), async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    if (!isRepresentative(booth, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload for this booth' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, message: 'File uploaded successfully', url: relativeUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// ─── Booth Meetings API Endpoints ──────────────────────────────────────────

// @desc    Get details for a single booth meeting by ID
// @route   GET /api/booths/meeting/:meetingId
// @access  Private
router.get('/meeting/:meetingId', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId)
      .populate('creator', 'name email role')
      .populate('booth', 'name logo description');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Booth meeting not found' });
    }

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create live meeting room for booth using BoothMeeting model
// @route   POST /api/booths/:id/meeting/create
// @access  Private
router.post('/:id/meeting/create', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    if (!isRepresentative(booth, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to start a meeting for this booth' });
    }

    const { title, description } = req.body;
    const meetingTitle = title || `${booth.name} Live Interaction Room`;
    const meetingDesc = description || `Connect with representatives from ${booth.name}`;

    let hmsRoom;
    try {
      hmsRoom = await createRoom(meetingTitle, meetingDesc);
    } catch (hmsError) {
      console.error('Failed to create 100ms room:', hmsError);
      return res.status(500).json({ success: false, message: 'Failed to provision video room on server.' });
    }

    const meeting = await BoothMeeting.create({
      booth: booth._id,
      title: meetingTitle,
      description: meetingDesc,
      hmsRoomId: hmsRoom.id,
      creator: req.user._id,
      participants: [req.user._id],
      status: 'active'
    });

    booth.meeting = meeting._id;
    booth.isLive = true;
    await booth.save();

    res.status(201).json({ success: true, message: 'Meeting room created successfully', meeting, booth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    End active meeting room for booth
// @route   POST /api/booths/:id/meeting/end
// @access  Private
router.post('/:id/meeting/end', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    if (!isRepresentative(booth, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to end this meeting' });
    }

    const { meetingId } = req.body;
    const targetMeetingId = meetingId || booth.meeting;

    if (targetMeetingId) {
      await BoothMeeting.findByIdAndUpdate(targetMeetingId, { status: 'completed' });
    }

    // Recalculate remaining active meetings
    const activeMeetings = await BoothMeeting.find({ booth: booth._id, status: 'active' }).sort({ createdAt: -1 });

    if (activeMeetings.length > 0) {
      booth.meeting = activeMeetings[0]._id;
      booth.isLive = true;
    } else {
      booth.meeting = undefined;
      booth.isLive = false;
    }
    await booth.save();

    res.status(200).json({ success: true, message: 'Booth meeting ended', booth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Generate Join Token for BoothMeeting
// @route   POST /api/booths/meeting/:meetingId/token
// @access  Private
router.post('/meeting/:meetingId/token', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const booth = await Booth.findById(meeting.booth);

    // Creator or booth reps get broadcaster role, visitors get viewer-on-stage
    let hmsRole = 'viewer-on-stage';
    if (meeting.creator.toString() === req.user._id.toString() || (booth && isRepresentative(booth, req.user))) {
      hmsRole = 'broadcaster';
    }

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

// @desc    Submit lobby queue request
// @route   POST /api/booths/meeting/:meetingId/lobby/request
// @access  Private
router.post('/meeting/:meetingId/lobby/request', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { peerId } = req.body;
    if (!peerId) {
      return res.status(400).json({ success: false, message: 'peerId is required' });
    }

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
    res.status(200).json({ success: true, message: 'Join request logged in lobby' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get user's lobby request status
// @route   GET /api/booths/meeting/:meetingId/lobby/status
// @access  Private
router.get('/meeting/:meetingId/lobby/status', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId);
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

// @desc    Get all pending lobby requests (Hosts only)
// @route   GET /api/booths/meeting/:meetingId/lobby/requests
// @access  Private
router.get('/meeting/:meetingId/lobby/requests', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId).populate('lobbyRequests.user', 'name email role');
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const booth = await Booth.findById(meeting.booth);
    const isAuthorized = meeting.creator.toString() === req.user._id.toString() || (booth && isRepresentative(booth, req.user));

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to view waitlist requests' });
    }

    const pending = meeting.lobbyRequests.filter(r => r.status === 'pending');
    res.status(200).json({ success: true, requests: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Admit a participant from the lobby
// @route   POST /api/booths/meeting/:meetingId/lobby/admit
// @access  Private
router.post('/meeting/:meetingId/lobby/admit', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { userId } = req.body;
    const reqIndex = meeting.lobbyRequests.findIndex(r => r.user.toString() === userId.toString());
    if (reqIndex === -1) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    meeting.lobbyRequests[reqIndex].status = 'approved';

    if (!meeting.participants.includes(userId)) {
      meeting.participants.push(userId);
    }

    await meeting.save();
    res.status(200).json({ success: true, message: 'Request approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Deny a participant from the lobby
// @route   POST /api/booths/meeting/:meetingId/lobby/deny
// @access  Private
router.post('/meeting/:meetingId/lobby/deny', protectUser, async (req, res) => {
  try {
    const meeting = await BoothMeeting.findById(req.params.meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const { userId } = req.body;
    const reqIndex = meeting.lobbyRequests.findIndex(r => r.user.toString() === userId.toString());
    if (reqIndex === -1) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    meeting.lobbyRequests[reqIndex].status = 'rejected';
    await meeting.save();
    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── Leads Tracker ──────────────────────────────────────────────────────────

// @desc    Log visitor lead
// @route   POST /api/booths/:id/leads
// @access  Private
router.post('/:id/leads', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    const { action, details } = req.body;
    if (!action || !['join_meeting', 'download_brochure'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Valid action is required' });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isDuplicate = booth.leads.some(
      (lead) =>
        lead.user.toString() === req.user._id.toString() &&
        lead.action === action &&
        lead.details === (details || '') &&
        lead.timestamp > fiveMinutesAgo
    );

    if (!isDuplicate) {
      booth.leads.push({
        user: req.user._id,
        action,
        details: details || '',
        timestamp: new Date()
      });
      await booth.save();
    }

    res.status(200).json({ success: true, message: 'Lead logged' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Retrieve all visitor leads for a booth
// @route   GET /api/booths/:id/leads
// @access  Private
router.get('/:id/leads', protectUser, async (req, res) => {
  try {
    const booth = await Booth.findById(req.params.id)
      .populate({
        path: 'leads.user',
        select: 'name email phone company role'
      });

    if (!booth) {
      return res.status(404).json({ success: false, message: 'Booth not found' });
    }

    if (!isRepresentative(booth, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view leads' });
    }

    const leads = booth.leads.sort((a, b) => b.timestamp - a.timestamp);
    res.status(200).json({ success: true, count: leads.length, leads });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
