const User = require('../models/User');
const Video = require('../models/Video');

exports.getCreators = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const role = req.query.role;
    const limit = parseInt(req.query.limit, 10) || 24;

    const query = { status: 'active' };
    if (role === 'creator') {
      query.uploadCount = { $gt: 0 };
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { username: regex },
        { email: regex },
      ];
    }

    const users = await User.find(query)
      .select('username avatar isPremium role uploadCount createdAt')
      .sort({ uploadCount: -1, createdAt: -1 })
      .limit(limit);

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const videos = await Video.find({ uploader: user._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();

    res.json({
      success: true,
      user,
      videos,
      stats: {
        videos: videos.length,
        uploads: user.uploadCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
