const User = require('../models/User');
const Video = require('../models/Video');
const Conversation = require('../models/Conversation');
const Subscription = require('../models/Subscription');
const Tip = require('../models/Tip');
const Demo = require('../demoStore');

exports.getCreators = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const role = req.query.role;
    const location = (req.query.location || '').trim();
    const category = (req.query.category || '').trim();
    const limit = parseInt(req.query.limit, 10) || 24;

    if (global.USE_DEMO && Demo) {
      const list = await Demo.listCreators({ limit, q: search });
      // Simple client-side filter for demo for location/category
      let filtered = list;
      if (location) filtered = filtered.filter(u => (u.location || '').toLowerCase().includes(location.toLowerCase()));
      if (category) filtered = filtered.filter(u => (u.creatorCategory || '').toLowerCase().includes(category.toLowerCase()));
      return res.json({ success: true, users: filtered.slice(0, limit) });
    }

    const query = { status: 'active' };
    if (role) query.role = role;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (category) query.creatorCategory = { $regex: category, $options: 'i' };

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { username: regex },
        { displayName: regex },
        { bio: regex },
        { location: regex },
      ];
    }

    const users = await User.find(query)
      .select('username displayName avatar isPremium role uploadCount createdAt location creatorCategory bio followers isLive')
      .sort({ uploadCount: -1, createdAt: -1 })
      .limit(limit);

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    if (global.USE_DEMO && Demo) {
      const profile = await Demo.getUserById(req.params.id);
      if (!profile) return res.status(404).json({ success: false, message: 'User not found.' });
      // Also return some posts for the profile page
      const postsRes = await Demo.getPosts({ creator: req.params.id, limit: 8 });
      return res.json({
        success: true,
        user: profile,
        posts: postsRes.posts || [],
        videos: [],
        stats: { uploads: profile.uploadCount || 0, followers: profile.followers || 0 },
      });
    }

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

// @desc Get creator dashboard data for current user
// @route GET /api/users/me/dashboard
exports.getCreatorDashboard = async (req, res) => {
  if (global.USE_DEMO && require('../demoStore')) {
    const Demo = require('../demoStore');
    // Return rich demo stats so creator dashboard is never empty
    return res.json({
      success: true,
      stats: {
        earningsThisMonth: 1240,
        activeSubscribers: 87,
        totalViews: 24500,
        totalLikes: 1890,
        tipsReceived: 320,
        unreadMessages: 4,
        payoutAvailable: 980
      },
      revenueChart: [
        { label: 'Jan', amount: 820 },
        { label: 'Feb', amount: 950 },
        { label: 'Mar', amount: 1100 },
        { label: 'Apr', amount: 1340 },
        { label: 'May', amount: 980 },
        { label: 'Jun', amount: 1240 }
      ],
      recentPosts: [
        { _id: 'p1', title: 'Golden hour set', views: 1240, likes: 89, status: 'approved', media: [{type:'image', url:'https://picsum.photos/id/1015/80/80'}] },
        { _id: 'p2', caption: 'New silk drop', views: 670, likes: 41, status: 'approved' }
      ]
    });
  }
  try {
    const userId = req.user._id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [latestVideos, videoStats, conversations, activeSubscribers, recentSubscribers, monthlySubRevenue, monthlyTipRevenue, tipSummary] = await Promise.all([
      Video.find({ uploader: userId }).sort({ createdAt: -1 }).limit(8).lean(),
      Video.aggregate([
        { $match: { uploader: userId } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            totalVideos: { $sum: 1 },
          },
        },
      ]),
      Conversation.find({ participants: userId }).lean(),
      Subscription.countDocuments({ user: userId, status: 'active' }),
      Subscription.find({ user: userId, status: 'active' }).sort({ createdAt: -1 }).limit(5).populate('user', 'username').lean(),
      Subscription.aggregate([
        { $match: { user: userId, status: 'active', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Tip.aggregate([
        { $match: { creator: userId, status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Tip.aggregate([
        { $match: { creator: userId, status: 'completed' } },
        { $group: { _id: null, totalTips: { $sum: '$amount' } } },
      ]),
    ]);

    const totalViews = videoStats[0]?.totalViews || 0;
    const totalVideos = videoStats[0]?.totalVideos || 0;
    const tipTotal = tipSummary[0]?.totalTips || 0;

    const revenueChart = [];
    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const label = monthDate.toLocaleString('en-US', { month: 'short' });
      const subEntry = monthlySubRevenue.find(item => item._id.year === monthDate.getFullYear() && item._id.month === monthDate.getMonth() + 1);
      const tipEntry = monthlyTipRevenue.find(item => item._id.year === monthDate.getFullYear() && item._id.month === monthDate.getMonth() + 1);
      revenueChart.push({ label, amount: (subEntry?.revenue || 0) + (tipEntry?.revenue || 0) });
    }

    const earningsThisMonthAgg = await Subscription.aggregate([
      { $match: { user: userId, status: 'active', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const tipThisMonthAgg = await Tip.aggregate([
      { $match: { creator: userId, status: 'completed', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const earningsThisMonth = (earningsThisMonthAgg[0]?.total || 0) + (tipThisMonthAgg[0]?.total || 0);
    const payoutAvailable = +(earningsThisMonth * 0.8).toFixed(2);

    const unreadMessages = conversations.reduce((sum, conv) => {
      const unread = conv.unread;
      const count = unread ? (typeof unread.get === 'function' ? unread.get(String(userId)) : unread[String(userId)]) : 0;
      return sum + (count || 0);
    }, 0);

    res.json({
      success: true,
      stats: {
        earningsThisMonth,
        activeSubscribers,
        totalViews,
        totalLikes: 0,
        tipsReceived: tipTotal,
        unreadMessages,
        payoutAvailable,
      },
      revenueChart,
      recentPosts: latestVideos.map(video => ({
        id: video._id,
        title: video.title,
        type: video.isPremium ? 'Premium' : 'Video',
        views: video.views || 0,
        likes: 0,
        status: video.status,
        createdAt: video.createdAt,
      })),
      newSubscribers: recentSubscribers.map(sub => ({
        username: sub.user?.username || 'Subscriber',
        plan: sub.plan,
        amount: sub.amount,
        createdAt: sub.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Get creator earnings data for current user
// @route GET /api/users/me/earnings
exports.getCreatorEarnings = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const subscriptions = await Subscription.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const tips = await Tip.find({ creator: userId, status: 'completed' }).sort({ createdAt: -1 }).lean();
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

    const subscriptionAllTime = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
    const tipAllTime = tips.reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const allTimeEarnings = subscriptionAllTime + tipAllTime;

    const thisMonthSubTotal = subscriptions
      .filter(sub => new Date(sub.createdAt) >= monthStart)
      .reduce((sum, sub) => sum + (sub.amount || 0), 0);
    const thisMonthTipTotal = tips
      .filter(tip => new Date(tip.createdAt) >= monthStart)
      .reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const thisMonthTotal = thisMonthSubTotal + thisMonthTipTotal;
    const availableBalance = +(thisMonthTotal * 0.8).toFixed(2);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlySubAgg = await Subscription.aggregate([
      { $match: { user: userId, status: 'active', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    const monthlyTipAgg = await Tip.aggregate([
      { $match: { creator: userId, status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const chartData = [];
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = monthDate.toLocaleString('en-US', { month: 'short' });
      const subEntry = monthlySubAgg.find(item => item._id.year === monthDate.getFullYear() && item._id.month === monthDate.getMonth() + 1);
      const tipEntry = monthlyTipAgg.find(item => item._id.year === monthDate.getFullYear() && item._id.month === monthDate.getMonth() + 1);
      chartData.push({ label, amount: (subEntry?.total || 0) + (tipEntry?.total || 0) });
    }

    const transactions = [
      ...subscriptions.map(sub => ({
        desc: `Subscription — ${sub.paymentMethod || 'payment'}`,
        type: 'sub',
        amount: sub.amount || 0,
        fee: +(sub.amount * 0.2 || 0).toFixed(2),
        net: +((sub.amount || 0) * 0.8).toFixed(2),
        date: sub.createdAt,
        status: sub.status,
      })),
      ...tips.map(tip => ({
        desc: 'Tip',
        type: 'tip',
        amount: tip.amount || 0,
        fee: +(tip.amount * 0.2 || 0).toFixed(2),
        net: +((tip.amount || 0) * 0.8).toFixed(2),
        date: tip.createdAt,
        status: tip.status,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      earnings: {
        availableBalance,
        thisMonthTotal,
        subscriptionRevenue: thisMonthSubTotal,
        tipsAndPpv: thisMonthTipTotal,
        allTimeEarnings,
        activeSubscriptions: activeSubscriptions.length,
      },
      monthlyBreakdown: chartData,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Update current user's profile
// @route PUT /api/users/me
exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const {
      username,
      displayName,
      email,
      bio,
      location,
      creatorCategory,
      creatorPitch,
      privacySettings,
      notificationPreferences,
    } = req.body;

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ success: false, message: 'Username already in use.' });
      user.username = username;
    }
    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use.' });
      user.email = email;
    }
    if (displayName) user.displayName = displayName;
    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof location !== 'undefined') user.location = location;
    if (typeof creatorCategory !== 'undefined') user.creatorCategory = creatorCategory;
    if (typeof creatorPitch !== 'undefined') user.creatorPitch = creatorPitch;
    if (typeof privacySettings !== 'undefined') {
      user.privacySettings = {
        ...user.privacySettings?.toObject?.(),
        ...privacySettings,
      };
    }
    if (typeof notificationPreferences !== 'undefined') {
      user.notificationPreferences = {
        ...user.notificationPreferences?.toObject?.(),
        ...notificationPreferences,
      };
    }

    await user.save();

    const safe = user.toObject();
    delete safe.password;
    res.json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Upload avatar image for current user
// @route POST /api/users/me/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Upload cover image for current user
// @route POST /api/users/me/cover
exports.uploadCover = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.coverImage = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ success: true, cover: user.coverImage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc Upgrade current user to creator
// @route POST /api/users/me/creator
exports.upgradeToCreator = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'creator') {
      return res.json({ success: true, message: 'Already a creator.', user });
    }

    const { creatorCategory, creatorPitch, displayName, bio } = req.body;
    user.role = 'creator';
    if (displayName) user.displayName = displayName;
    if (typeof bio !== 'undefined') user.bio = bio;
    if (typeof creatorCategory !== 'undefined') user.creatorCategory = creatorCategory;
    if (typeof creatorPitch !== 'undefined') user.creatorPitch = creatorPitch;
    if (!user.displayName) user.displayName = user.username;

    await user.save();
    const safe = user.toObject();
    delete safe.password;
    res.json({ success: true, message: 'Your account is now a creator.', user: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
