const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protectUser } = require('../middleware/auth');
const { USER_ROLES } = require('../constants/roles');

const requireAdminOrOrganizer = (req, res, next) => {
  if (!req.user || ![USER_ROLES.ADMIN, USER_ROLES.ORGANIZER].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Organizer role required.',
    });
  }
  next();
};

// @desc    Submit a contact form
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { name, companyName, email, phone, description } = req.body;

    if (!name || !email || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email, and Description are required fields.',
      });
    }

    const contact = await Contact.create({
      name,
      companyName: companyName || '',
      email,
      phone: phone || '',
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully! We will get back to you soon.',
      data: contact,
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form.',
      error: error.message,
    });
  }
});

// @desc    Get paginated contact submissions
// @route   GET /api/contact
// @access  Admin / Organizer
router.get('/', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, contacts] = await Promise.all([
      Contact.countDocuments(query),
      Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submissions.',
      error: error.message,
    });
  }
});

// @desc    Update contact status
// @route   PATCH /api/contact/:id/status
// @access  Admin / Organizer
router.patch('/:id/status', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.',
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact record not found.',
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact status.',
      error: error.message,
    });
  }
});

// @desc    Delete contact submission
// @route   DELETE /api/contact/:id
// @access  Admin / Organizer
router.delete('/:id', protectUser, requireAdminOrOrganizer, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact record not found.',
      });
    }

    res.json({
      success: true,
      message: 'Contact submission deleted successfully.',
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact submission.',
      error: error.message,
    });
  }
});

module.exports = router;
