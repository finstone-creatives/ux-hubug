const User = require('../models/User');
const socketManager = require('../socket');

const LIVE_FIELDS = 'username displayName avatar coverImage role isLive liveTitle liveCategory liveAccess liveStartedAt liveViewers location creatorCategory creatorPitch';

exports.getLiveSessions = async (req, res) => {
  try {
    const liveCreators = await User.find({ role: 'creator', isLive: true, status: 'active' })
      .select(LIVE_FIELDS)
      .sort({ liveStartedAt: -1 });

    res.json({ success: true, lives: liveCreators });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyLive = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(LIVE_FIELDS);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, live: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLiveSession = async (req, res) => {
  try {
    const liveCreator = await User.findOne({ _id: req.params.id, role: 'creator', isLive: true, status: 'active' })
      .select(LIVE_FIELDS);

    if (!liveCreator) {
      return res.status(404).json({ success: false, message: 'Live session not found.' });
    }

    res.json({ success: true, live: liveCreator });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.startLive = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ success: false, message: 'Only creators can start live streams.' });
    }

    const { title, category, access } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Live stream title is required.' });
    }

    const liveCreator = await User.findByIdAndUpdate(req.user.id, {
      isLive: true,
      liveTitle: title.trim(),
      liveCategory: category || 'Live',
      liveAccess: access || 'public',
      liveStartedAt: Date.now(),
      liveViewers: 0,
    }, { new: true }).select(LIVE_FIELDS);

    const io = socketManager.getIO();
    if (io) {
      io.emit('live:update', { type: 'start', live: liveCreator });
    }

    res.json({ success: true, message: 'Live stream started.', live: liveCreator });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.endLive = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ success: false, message: 'Only creators can end live streams.' });
    }

    const liveCreator = await User.findByIdAndUpdate(req.user.id, {
      isLive: false,
      liveViewers: 0,
      liveStartedAt: null,
    }, { new: true }).select(LIVE_FIELDS);

    const io = socketManager.getIO();
    if (io) {
      io.emit('live:update', { type: 'end', userId: req.user.id });
    }

    res.json({ success: true, message: 'Live stream ended.', live: liveCreator });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.joinLive = async (req, res) => {
  try {
    const creatorId = req.params.id;
    const liveCreator = await User.findOneAndUpdate(
      { _id: creatorId, role: 'creator', isLive: true, status: 'active' },
      { $inc: { liveViewers: 1 } },
      { new: true }
    ).select(LIVE_FIELDS);

    if (!liveCreator) {
      return res.status(404).json({ success: false, message: 'Live session not found.' });
    }

    const io = socketManager.getIO();
    if (io) {
      io.emit('live:update', { type: 'viewer', live: liveCreator });
    }

    res.json({ success: true, message: 'Joined live stream.', live: liveCreator });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.leaveLive = async (req, res) => {
  try {
    const creatorId = req.params.id;
    const liveCreator = await User.findOneAndUpdate(
      { _id: creatorId, role: 'creator', isLive: true, status: 'active', liveViewers: { $gt: 0 } },
      { $inc: { liveViewers: -1 } },
      { new: true }
    ).select(LIVE_FIELDS);

    if (!liveCreator) {
      return res.status(404).json({ success: false, message: 'Live session not found.' });
    }

    const io = socketManager.getIO();
    if (io) {
      io.emit('live:update', { type: 'viewer', live: liveCreator });
    }

    res.json({ success: true, message: 'Left live stream.', live: liveCreator });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
