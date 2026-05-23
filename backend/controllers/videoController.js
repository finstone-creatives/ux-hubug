const Video = require('../models/Video');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const path = require('path');
const fs = require('fs');

// @desc    Upload video
// @route   POST /api/videos/upload
exports.uploadVideo = async (req, res) =>
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file uploaded.' });
    }

    const { title, description, resolution, tags, category } = req.body;

    const video = await Video.create({
      title,
      description,
      filename: req.file.filename,
      filePath: req.file.path,
      uploader: req.user.id,
      resolution: resolution || 'HD',
      fileSize: req.file.size,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      category: category || 'General',
      status: 'pending',
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { uploadCount: 1 } });

    try {
      if (req.user.notificationPreferences?.notifPost !== false) {
        await createNotification({
          recipient: req.user._id,
          sender: req.user._id,
          type: 'video',
          title: 'Video upload submitted',
          message: `Your video "${title}" was uploaded and is awaiting moderation.`,
          link: `/pages/profile.html?id=${req.user._id}`,
        });
      }
    } catch (e) {
      console.error('Video upload notification failed', e);
    }

    res.status(201).json({ success: true, message: 'Video uploaded. Awaiting moderation.', video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get approved videos (public feed)
// @route   GET /api/videos
exports.getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    let query = { status: 'approved' };

    if (search) {
      query.$text = { $search: search };
    }

    const videos = await Video.find(query)
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single video & increment views
// @route   GET /api/videos/:id
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('uploader', 'username avatar');

    if (!video || video.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    if (video.isPremium && (!req.user || !req.user.isPremium)) {
      return res.status(403).json({ success: false, message: 'Premium subscription required.' });
    }

    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    const isOwner = video.uploader.toString() === req.user.id;
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Delete file from disk
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    await video.deleteOne();
    res.json({ success: true, message: 'Video deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Report a video
// @route   POST /api/videos/:id/report
exports.reportVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    video.flagReports.push({ reportedBy: req.user.id, reason: req.body.reason });
    if (video.flagReports.length >= 5) video.status = 'flagged';
    await video.save();

    res.json({ success: true, message: 'Video reported.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
