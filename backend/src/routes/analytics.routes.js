const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Question = require('../models/Question');
const Booth = require('../models/Booth');
const { protectUser } = require('../middleware/auth');

// Middleware: Restrict access to roles: admin, organizer, exhibitor, sponsor
const restrictAnalyticsAccess = (req, res, next) => {
  const allowedRoles = ['admin', 'organizer', 'exhibitor', 'sponsor'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admins, organizers, exhibitors, and sponsors can access analytics.'
    });
  }
  next();
};

// Helper: Calculate date range based on filter string
function getDateRange(filter, startDate, endDate) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (filter) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last7days':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastmonth':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(0);
      start.setHours(0, 0, 0, 0);
      end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

// Helper: Format relative timestamp
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Helper: Generate registration trend series
async function generateHistoryData(start, end, filter) {
  const historyData = [];
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (filter === 'today' || filter === 'yesterday' || diffDays <= 1) {
    for (let h = 0; h < 24; h += 4) {
      const slotStart = new Date(start);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(start);
      slotEnd.setHours(h + 3, 59, 59, 999);

      const count = await User.countDocuments({ createdAt: { $gte: slotStart, $lte: slotEnd } });
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      historyData.push({
        label: `${displayHour} ${ampm}`,
        value: count
      });
    }
  } else if (filter === 'last7days' || diffDays <= 7) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 6; d >= 0; d--) {
      const dayDate = new Date(end);
      dayDate.setDate(dayDate.getDate() - d);
      const slotStart = new Date(dayDate);
      slotStart.setHours(0, 0, 0, 0);
      const slotEnd = new Date(dayDate);
      slotEnd.setHours(23, 59, 59, 999);

      const count = await User.countDocuments({ createdAt: { $gte: slotStart, $lte: slotEnd } });
      historyData.push({
        label: `${dayNames[slotStart.getDay()]} (${slotStart.getMonth() + 1}/${slotStart.getDate()})`,
        value: count
      });
    }
  } else if (filter === 'lastmonth' || diffDays <= 31) {
    for (let w = 3; w >= 0; w--) {
      const slotEnd = new Date(end);
      slotEnd.setDate(slotEnd.getDate() - w * 7);
      slotEnd.setHours(23, 59, 59, 999);

      const slotStart = new Date(slotEnd);
      slotStart.setDate(slotStart.getDate() - 6);
      slotStart.setHours(0, 0, 0, 0);

      const count = await User.countDocuments({ createdAt: { $gte: slotStart, $lte: slotEnd } });
      historyData.push({
        label: `Week ${4 - w}`,
        value: count
      });
    }
  } else {
    let current = new Date(start);
    while (current <= end) {
      const slotStart = new Date(current);
      slotStart.setDate(1);
      slotStart.setHours(0, 0, 0, 0);

      const slotEnd = new Date(current);
      slotEnd.setMonth(slotEnd.getMonth() + 1);
      slotEnd.setDate(0);
      slotEnd.setHours(23, 59, 59, 999);

      const count = await User.countDocuments({ createdAt: { $gte: slotStart, $lte: slotEnd } });
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      historyData.push({
        label: `${monthNames[slotStart.getMonth()]} ${slotStart.getFullYear()}`,
        value: count
      });

      current.setMonth(current.getMonth() + 1);
    }
  }
  return historyData;
}

// Helper: Generate completed meeting trend series
async function generateMeetingTrend(start, end, filter) {
  const trendData = [];
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (filter === 'today' || filter === 'yesterday' || diffDays <= 1) {
    for (let h = 0; h < 24; h += 4) {
      const slotStart = new Date(start);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(start);
      slotEnd.setHours(h + 3, 59, 59, 999);

      const count = await Meeting.countDocuments({
        stageType: 'none',
        status: 'completed',
        createdAt: { $gte: slotStart, $lte: slotEnd }
      });
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      trendData.push({ label: `${displayHour} ${ampm}`, value: count });
    }
  } else if (filter === 'last7days' || diffDays <= 7) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let d = 6; d >= 0; d--) {
      const dayDate = new Date(end);
      dayDate.setDate(dayDate.getDate() - d);
      const slotStart = new Date(dayDate);
      slotStart.setHours(0, 0, 0, 0);
      const slotEnd = new Date(dayDate);
      slotEnd.setHours(23, 59, 59, 999);

      const count = await Meeting.countDocuments({
        stageType: 'none',
        status: 'completed',
        createdAt: { $gte: slotStart, $lte: slotEnd }
      });
      trendData.push({
        label: `${dayNames[slotStart.getDay()]} (${slotStart.getMonth() + 1}/${slotStart.getDate()})`,
        value: count
      });
    }
  } else if (filter === 'lastmonth' || diffDays <= 31) {
    for (let w = 3; w >= 0; w--) {
      const slotEnd = new Date(end);
      slotEnd.setDate(slotEnd.getDate() - w * 7);
      slotEnd.setHours(23, 59, 59, 999);

      const slotStart = new Date(slotEnd);
      slotStart.setDate(slotStart.getDate() - 6);
      slotStart.setHours(0, 0, 0, 0);

      const count = await Meeting.countDocuments({
        stageType: 'none',
        status: 'completed',
        createdAt: { $gte: slotStart, $lte: slotEnd }
      });
      trendData.push({ label: `Week ${4 - w}`, value: count });
    }
  } else {
    let current = new Date(start);
    while (current <= end) {
      const slotStart = new Date(current);
      slotStart.setDate(1);
      slotStart.setHours(0, 0, 0, 0);

      const slotEnd = new Date(current);
      slotEnd.setMonth(slotEnd.getMonth() + 1);
      slotEnd.setDate(0);
      slotEnd.setHours(23, 59, 59, 999);

      const count = await Meeting.countDocuments({
        stageType: 'none',
        status: 'completed',
        createdAt: { $gte: slotStart, $lte: slotEnd }
      });
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      trendData.push({
        label: `${monthNames[slotStart.getMonth()]} ${slotStart.getFullYear()}`,
        value: count
      });
      current.setMonth(current.getMonth() + 1);
    }
  }
  return trendData;
}

// @desc    Get real aggregation analytics report
// @route   GET /api/analytics
// @access  Private (Admins, Organizers, Exhibitors, Sponsors)
router.get('/', protectUser, restrictAnalyticsAccess, async (req, res) => {
  try {
    const { filter = 'last7days', startDate, endDate } = req.query;
    const { start, end } = getDateRange(filter, startDate, endDate);

    // ─── 1. USER ANALYTICS ───
    const totalRegistrations = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const activeUsers = await User.countDocuments({ isActive: true });

    const roles = ['admin', 'organizer', 'speaker', 'exhibitor', 'startup_participant', 'sponsor', 'attendee'];
    const userRolesAggregate = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleCounts = {};
    roles.forEach(r => { roleCounts[r] = 0; });
    userRolesAggregate.forEach(item => {
      if (roleCounts[item._id] !== undefined) {
        roleCounts[item._id] = item.count;
      }
    });

    const roleData = Object.keys(roleCounts).map(role => {
      let label = role;
      if (role === 'startup_participant') label = 'Startup Participant';
      else {
        label = role.charAt(0).toUpperCase() + role.slice(1);
      }
      return { role: label, count: roleCounts[role] };
    });

    const recentUsers = await User.find({ createdAt: { $gte: start, $lte: end } })
      .select('name email role company createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const userHistoryData = await generateHistoryData(start, end, filter);

    // ─── 2. MEETING ANALYTICS ───
    const totalMeetings = await Meeting.countDocuments({ stageType: 'none', createdAt: { $gte: start, $lte: end } });
    const meetingsScheduled = await Meeting.countDocuments({ stageType: 'none', status: 'scheduled', createdAt: { $gte: start, $lte: end } });
    const meetingsActive = await Meeting.countDocuments({ stageType: 'none', status: 'active', createdAt: { $gte: start, $lte: end } });
    const meetingsCompleted = await Meeting.countDocuments({ stageType: 'none', status: 'completed', createdAt: { $gte: start, $lte: end } });

    const meetingDurationResult = await Meeting.aggregate([
      { $match: { stageType: 'none', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);
    const totalDurationMinutes = meetingDurationResult.length > 0 ? meetingDurationResult[0].total : 0;
    const totalMeetingHours = parseFloat((totalDurationMinutes / 60).toFixed(1));

    const meetingsForParticipants = await Meeting.find({
      stageType: 'none',
      createdAt: { $gte: start, $lte: end }
    }).select('participants');
    const participantIds = new Set();
    meetingsForParticipants.forEach(m => {
      if (m.participants) {
        m.participants.forEach(p => participantIds.add(p.toString()));
      }
    });
    const uniqueParticipantsCount = participantIds.size;

    const meetingsList = await Meeting.find({ stageType: 'none', createdAt: { $gte: start, $lte: end } })
      .populate('creator', 'name email role')
      .populate('participants', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);

    const meetingHistoryData = await generateMeetingTrend(start, end, filter);

    // ─── 3. BOOTH ANALYTICS ───
    const booths = await Booth.find()
      .populate('representatives', 'name email role company')
      .select('name category tier visitCount logo brochures representatives leads');

    let totalVisitsInRange = 0;
    let brochureDownloadsInRange = 0;
    const boothInteractionsMap = {};

    booths.forEach(b => {
      boothInteractionsMap[b.name] = 0;
      if (b.leads) {
        b.leads.forEach(lead => {
          if (lead.timestamp >= start && lead.timestamp <= end) {
            boothInteractionsMap[b.name]++;
            if (lead.action === 'download_brochure') {
              brochureDownloadsInRange++;
            }
            totalVisitsInRange++;
          }
        });
      }
    });

    const totalBooths = booths.length;
    const sponsorsCount = booths.filter(b => b.category === 'sponsor').length;
    const exhibitorsCount = booths.filter(b => b.category === 'exhibitor').length;

    let topBooths = Object.keys(boothInteractionsMap)
      .map(name => ({ name, count: boothInteractionsMap[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topBooths.length === 0 || topBooths.every(b => b.count === 0)) {
      topBooths = booths
        .map(b => ({ name: b.name, count: b.visitCount || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    const boothsList = booths.map(b => {
      const rangeInteractions = b.leads ? b.leads.filter(l => l.timestamp >= start && l.timestamp <= end).length : 0;
      const rangeDownloads = b.leads ? b.leads.filter(l => l.timestamp >= start && l.timestamp <= end && l.action === 'download_brochure').length : 0;
      return {
        id: b._id,
        name: b.name,
        category: b.category,
        tier: b.tier,
        cumulativeVisits: b.visitCount || 0,
        rangeInteractions,
        rangeDownloads,
        representativeCount: b.representatives ? b.representatives.length : 0
      };
    });

    // ─── 4. ENGAGEMENT REPORTS ───
    const mainStageMeeting = await Meeting.findOne({ stageType: 'main_stage' });
    const pitchMeeting = await Meeting.findOne({ stageType: 'pitch' });

    // Main Stage Engagement
    let mainStageViewers = 0;
    let mainStageQuestionsTotal = 0;
    let mainStageQuestionsApproved = 0;

    if (mainStageMeeting) {
      mainStageViewers = mainStageMeeting.participants ? mainStageMeeting.participants.length : 0;
      const msQuestions = await Question.find({
        meetingId: mainStageMeeting._id,
        createdAt: { $gte: start, $lte: end }
      });
      mainStageQuestionsTotal = msQuestions.length;
      mainStageQuestionsApproved = msQuestions.filter(q => q.status === 'approved').length;
    }

    // Startup Pitch Engagement
    let pitchStageViewers = 0;
    let pitchStageQuestionsTotal = 0;
    let pitchStageQuestionsApproved = 0;

    if (pitchMeeting) {
      pitchStageViewers = pitchMeeting.participants ? pitchMeeting.participants.length : 0;
      const pQuestions = await Question.find({
        meetingId: pitchMeeting._id,
        createdAt: { $gte: start, $lte: end }
      });
      pitchStageQuestionsTotal = pQuestions.length;
      pitchStageQuestionsApproved = pQuestions.filter(q => q.status === 'approved').length;
    }

    // Combine recent interactions timeline
    const timeline = [];

    // Registered users
    const usersTimeline = await User.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(5);
    usersTimeline.forEach(u => {
      timeline.push({
        action: `New registered ${u.role === 'attendee' ? 'attendee' : u.role.replace('_', ' ')}`,
        user: u.email,
        timestamp: u.createdAt,
        time: formatTimeAgo(u.createdAt)
      });
    });

    // Q&A questions asked
    const questionsTimeline = await Question.find({ createdAt: { $gte: start, $lte: end } })
      .populate('meetingId')
      .sort({ createdAt: -1 })
      .limit(5);
    questionsTimeline.forEach(q => {
      const stageName = q.meetingId ? q.meetingId.title : 'Live Room';
      timeline.push({
        action: `Asked Q&A question on ${stageName}`,
        user: q.askedBy || 'Anonymous',
        timestamp: q.createdAt,
        time: formatTimeAgo(q.createdAt)
      });
    });

    // Booth visitor leads logged
    booths.forEach(b => {
      if (b.leads) {
        b.leads.forEach(lead => {
          if (lead.timestamp >= start && lead.timestamp <= end) {
            const userEmail = lead.user && lead.user.email ? lead.user.email : 'Attendee';
            timeline.push({
              action: lead.action === 'download_brochure' ? `Downloaded Brochure from ${b.name}` : `Visited ${b.name} booth`,
              user: userEmail,
              timestamp: lead.timestamp,
              time: formatTimeAgo(lead.timestamp)
            });
          }
        });
      }
    });

    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const finalTimeline = timeline.slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        users: {
          totalRegistrations,
          activeUsers,
          roleData,
          recentUsers,
          historyData: userHistoryData
        },
        meetings: {
          totalMeetings,
          scheduled: meetingsScheduled,
          active: meetingsActive,
          completed: meetingsCompleted,
          totalHours: totalMeetingHours,
          uniqueParticipants: uniqueParticipantsCount,
          list: meetingsList,
          historyData: meetingHistoryData
        },
        booths: {
          totalBooths,
          sponsors: sponsorsCount,
          exhibitors: exhibitorsCount,
          totalVisits: totalVisitsInRange,
          brochureDownloads: brochureDownloadsInRange,
          topBooths,
          list: boothsList
        },
        engagement: {
          mainStage: {
            viewersCount: mainStageViewers,
            totalQuestions: mainStageQuestionsTotal,
            approvedQuestions: mainStageQuestionsApproved
          },
          pitchStage: {
            viewersCount: pitchStageViewers,
            totalQuestions: pitchStageQuestionsTotal,
            approvedQuestions: pitchStageQuestionsApproved
          },
          timeline: finalTimeline
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
