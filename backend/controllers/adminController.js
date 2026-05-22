const User = require('../models/User');
const Video = require('../models/Video');
const Ad = require('../models/Ad');
const Subscription = require('../models/Subscription');

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalVideos, totalRevenue, activeAds, pendingVideos, bannedUsers] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments({ status: 'approved' }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Ad.countDocuments({ status: 'active' }),
      Video.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'banned' }),
    ]);

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Subscription.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'active' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalVideos,
        totalRevenue: totalRevenue[0]?.total || 0,
        activeAds,
        pendingVideos,
        bannedUsers,
        monthlyRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────────

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    let query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'banned', banReason: reason, bannedAt: Date.now(), bannedBy: req.user.id },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `User ${user.username} banned.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'active', banReason: null, bannedAt: null, bannedBy: null },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `User ${user.username} unbanned.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `Role updated to ${role}.`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── VIDEO MODERATION ──────────────────────────────────────────────────────────

exports.getPendingVideos = async (req, res) => {
  try {
    const filter = req.query.status || 'pending';
    const videos = await Video.find({ status: filter })
      .populate('uploader', 'username email')
      .sort({ createdAt: -1 });
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.moderateVideo = async (req, res) => {
  try {
    const { action, note } = req.body; // action: 'approved' | 'rejected'
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      {
        status: action,
        moderatedBy: req.user.id,
        moderationNote: note,
        moderatedAt: Date.now(),
      },
      { new: true }
    ).populate('uploader', 'username');

    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
    res.json({ success: true, message: `Video ${action}.`, video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── AD MANAGEMENT ─────────────────────────────────────────────────────────────

exports.getAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json({ success: true, ads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAd = async (req, res) => {
  try {
    const ad = await Ad.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAd = async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found.' });
    res.json({ success: true, ad });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAd = async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ad deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── REVENUE ───────────────────────────────────────────────────────────────────

exports.getRevenue = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' })
      .populate('user', 'username email')
      .sort({ createdAt: -1 });

    const byMethod = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const totalRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0);

    res.json({ success: true, subscriptions, byMethod, totalRevenue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
