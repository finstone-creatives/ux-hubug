/**
 * DEMO STORE — In-memory data layer for NxtDoor when Mongo is unavailable.
 * Provides realistic data + full CRUD so every feature "just works".
 * Data resets on server restart (perfect for demos).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Seed data (rich, professional, African-focused creators)
let users = [
  {
    _id: 'u_amara',
    username: 'Amara_Official',
    displayName: 'Amara Nambi',
    email: 'amara@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xK0Y9v7pZ8eC', // Test1234!
    role: 'creator',
    status: 'active',
    ageVerified: true,
    dateOfBirth: new Date('1995-05-12'),
    isPremium: true,
    premiumExpiry: new Date(Date.now() + 1000*3600*24*90),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&q=80',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    bio: 'Kampala-based model & dancer. Exclusive lifestyle, dance tutorials & private moments. 18+ only.',
    creatorCategory: 'Model & Dancer',
    creatorPitch: 'Join for daily stories, behind the scenes, and live Q&As you won\'t see anywhere else.',
    location: 'Kampala, Uganda',
    uploadCount: 47,
    followers: 12480,
    following: [],
    isLive: true,
    liveTitle: 'Late Night Vibes with Amara',
    liveCategory: 'Chill',
    liveAccess: 'subscribers',
    liveStartedAt: new Date(Date.now() - 1000 * 60 * 18),
    liveViewers: 187,
    lastLogin: new Date(),
    createdAt: new Date('2024-11-02'),
  },
  {
    _id: 'u_zara',
    username: 'ZaraLux',
    displayName: 'Zara Okello',
    email: 'zara@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xK0Y9v7pZ8eC',
    role: 'creator',
    status: 'active',
    ageVerified: true,
    dateOfBirth: new Date('1997-03-22'),
    isPremium: true,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&q=80',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
    bio: 'Nairobi creative. Fashion, wellness & sensual storytelling. Premium photosets + voice notes.',
    creatorCategory: 'Fashion & Lifestyle',
    creatorPitch: 'Curated sensual content + real conversations. Subscribers get priority DMs.',
    location: 'Nairobi, Kenya',
    uploadCount: 31,
    followers: 8720,
    following: [],
    isLive: false,
    lastLogin: new Date(),
    createdAt: new Date('2024-12-15'),
  },
  {
    _id: 'u_rose',
    username: 'RoseInBloom',
    displayName: 'Rose Achieng',
    email: 'rose@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xK0Y9v7pZ8eC',
    role: 'creator',
    status: 'active',
    ageVerified: true,
    dateOfBirth: new Date('1994-09-09'),
    isPremium: false,
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=256&q=80',
    coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
    bio: 'Kampala entrepreneur & content creator. Empowering, playful & exclusive. Book me for custom.',
    creatorCategory: 'Lifestyle Creator',
    creatorPitch: 'Fun, flirty and real. Weekly lives + custom requests open for subs.',
    location: 'Kampala, Uganda',
    uploadCount: 19,
    followers: 4310,
    following: [],
    isLive: true,
    liveTitle: 'Morning Coffee & Chit Chat',
    liveCategory: 'Casual',
    liveAccess: 'public',
    liveStartedAt: new Date(Date.now() - 1000 * 60 * 47),
    liveViewers: 64,
    lastLogin: new Date(),
    createdAt: new Date('2025-01-20'),
  },
  {
    _id: 'u_fan1',
    username: 'kigali_king',
    displayName: 'David M.',
    email: 'fan1@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xK0Y9v7pZ8eC',
    role: 'user',
    status: 'active',
    ageVerified: true,
    dateOfBirth: new Date('1992-11-03'),
    isPremium: true,
    avatar: null,
    bio: 'Supporter of great African creators.',
    location: 'Kigali, Rwanda',
    followers: 0,
    following: ['u_amara', 'u_zara'],
    lastLogin: new Date(),
    createdAt: new Date('2025-02-01'),
  },
  {
    _id: 'u_admin',
    username: 'platform_admin',
    displayName: 'NxtDoor Admin',
    email: 'admin@uxhub.local',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5xK0Y9v7pZ8eC',
    role: 'admin',
    status: 'active',
    ageVerified: true,
    dateOfBirth: new Date('1990-01-01'),
    isPremium: false,
    avatar: null,
    lastLogin: new Date(),
    createdAt: new Date('2024-10-01'),
  }
];

// Correct bcrypt hashes for instant reliable demo login (generated at setup)
const TEST_PW_HASH = '$2a$12$SckiefkCFkj25.qr.SsvEuVAP5qnETB78KFyBCb7scDdnQSRnk4n6';
const ADMIN_PW_HASH = '$2a$12$30H5hOsyd9n2DhX1JMiPnOa9qxBYHcbEd6eUonUI1wijFtcNHKZcW';

for (let u of users) {
  if (u.email === 'admin@uxhub.local') {
    u.password = ADMIN_PW_HASH;
  } else {
    u.password = TEST_PW_HASH;
  }
}

let posts = [
  {
    _id: 'p1',
    creator: 'u_amara',
    caption: 'Golden hour in my private garden. Full set in the premium vault. Who wants the uncut video?',
    type: 'image',
    media: [{ url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', type: 'image' }],
    isPremium: true,
    price: 12,
    status: 'approved',
    likes: ['u_fan1'],
    likesCount: 1240,
    savesCount: 89,
    commentsCount: 67,
    viewsCount: 8900,
    tags: ['exclusive', 'behindthescenes'],
    createdAt: new Date(Date.now() - 1000*3600*5),
  },
  {
    _id: 'p2',
    creator: 'u_zara',
    caption: 'New silk robe drop. Subscribers — this color story is for you only.',
    type: 'image',
    media: [{ url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80', type: 'image' }],
    isPremium: false,
    status: 'approved',
    likes: [],
    likesCount: 643,
    savesCount: 41,
    commentsCount: 29,
    viewsCount: 4210,
    tags: ['fashion'],
    createdAt: new Date(Date.now() - 1000*3600*19),
  },
  {
    _id: 'p3',
    creator: 'u_rose',
    caption: 'POV: you just got home and I made your favorite. Come say hi live tonight.',
    type: 'video',
    media: [{ url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80', type: 'image', thumbnail: 'https://picsum.photos/id/1011/640/360' }],
    isPremium: false,
    status: 'approved',
    likes: ['u_fan1'],
    likesCount: 312,
    savesCount: 27,
    commentsCount: 18,
    viewsCount: 1880,
    tags: ['lifestyle'],
    createdAt: new Date(Date.now() - 1000*3600*31),
  }
];

let conversations = [];
let messages = [];
let liveTips = []; // for demo
let subscriptions = []; // simple {fanId, creatorId, activeUntil}

let stats = {
  totalUsers: 18420,
  totalCreators: 1240,
  totalRevenue: 872400,
  monthlySubs: 3120
};

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sanitizeUser(u, includePrivate = false) {
  if (!u) return null;
  const out = { ...u };
  delete out.password;
  if (!includePrivate) {
    delete out.email;
  }
  out.id = out._id;
  return out;
}

const Demo = {
  // AUTH
  async register({ username, displayName, email, password, dateOfBirth, ageConfirmed, accountType }) {
    const exists = users.find(u => u.email === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
    if (exists) throw new Error('Email or username already in use.');
    const dob = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18 || !ageConfirmed) throw new Error('You must be 18+ and confirm age.');
    const hashed = await bcrypt.hash(password, 12);
    const isCreator = accountType === 'creator';
    const newUser = {
      _id: generateId('u'),
      username: username.trim(),
      displayName: displayName || username,
      email: email.toLowerCase(),
      password: hashed,
      role: isCreator ? 'creator' : 'user',
      status: 'active',
      ageVerified: true,
      dateOfBirth: dob,
      isPremium: false,
      avatar: null,
      bio: '',
      location: 'East Africa',
      uploadCount: 0,
      followers: 0,
      following: [],
      createdAt: new Date(),
    };
    users.push(newUser);
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'demo-secret', { expiresIn: '7d' });
    return {
      success: true,
      token,
      user: sanitizeUser(newUser)
    };
  },

  async login(email, password) {
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) throw new Error('Invalid credentials.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('Invalid credentials.');
    if (user.status === 'banned') throw new Error('Account banned.');
    user.lastLogin = new Date();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'demo-secret', { expiresIn: '7d' });
    return {
      success: true,
      token,
      user: sanitizeUser(user, true)
    };
  },

  async getMe(userId) {
    const u = users.find(x => x._id === userId);
    return sanitizeUser(u, true);
  },

  // USERS
  async listCreators({ limit = 12, q = '' } = {}) {
    let list = users.filter(u => u.role === 'creator' && u.status === 'active');
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(u => (u.username + u.displayName + u.bio + u.location).toLowerCase().includes(qq));
    }
    return list.slice(0, limit).map(u => ({
      ...sanitizeUser(u),
      isOnline: Math.random() > 0.4,
      uploadCount: u.uploadCount || 0,
    }));
  },

  async getUserById(id) {
    const u = users.find(x => x._id === id);
    if (!u) return null;
    return {
      ...sanitizeUser(u),
      isOnline: u.isLive || Math.random() > 0.55,
      uploadCount: u.uploadCount || Math.floor(Math.random() * 40) + 5,
    };
  },

  async follow(userId, targetId) {
    const me = users.find(u => u._id === userId);
    if (!me) throw new Error('User not found');
    if (!me.following) me.following = [];
    const idx = me.following.indexOf(targetId);
    if (idx >= 0) {
      me.following.splice(idx, 1);
      const t = users.find(u => u._id === targetId);
      if (t) t.followers = Math.max(0, (t.followers || 0) - 1);
      return { following: false };
    } else {
      me.following.push(targetId);
      const t = users.find(u => u._id === targetId);
      if (t) t.followers = (t.followers || 0) + 1;
      return { following: true };
    }
  },

  // POSTS
  async getPosts({ page = 1, limit = 12, creator = null, feed = null, userId = null } = {}) {
    let filtered = posts.filter(p => p.status === 'approved');
    if (creator) filtered = filtered.filter(p => p.creator === creator);
    if (feed === 'following' && userId) {
      const me = users.find(u => u._id === userId);
      const following = me?.following || [];
      filtered = filtered.filter(p => following.includes(p.creator));
    }
    // sort newest
    filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (page-1) * limit;
    const slice = filtered.slice(start, start + limit);
    const enriched = slice.map(p => {
      const creatorUser = users.find(u => u._id === p.creator);
      return {
        ...p,
        creator: creatorUser ? sanitizeUser(creatorUser) : { username: 'creator' },
      };
    });
    return { success: true, posts: enriched, pagination: { page, total: filtered.length, pages: Math.ceil(filtered.length / limit) } };
  },

  async createPost(creatorId, { caption, type = 'image', isPremium = false, price = 0, media = [] }) {
    const creator = users.find(u => u._id === creatorId && u.role === 'creator');
    if (!creator) throw new Error('Only creators can post.');
    const newPost = {
      _id: generateId('p'),
      creator: creatorId,
      caption: caption || '',
      type,
      media: media.length ? media : [{ url: 'https://picsum.photos/id/1015/800/800', type: 'image' }],
      isPremium: !!isPremium,
      price: Number(price) || 0,
      status: 'approved',
      likes: [],
      likesCount: 0,
      savesCount: 0,
      commentsCount: 0,
      viewsCount: 1,
      tags: [],
      createdAt: new Date(),
    };
    posts.unshift(newPost);
    creator.uploadCount = (creator.uploadCount || 0) + 1;
    return { success: true, post: newPost };
  },

  async toggleLike(postId, userId) {
    const p = posts.find(x => x._id === postId);
    if (!p) throw new Error('Post not found');
    if (!p.likes) p.likes = [];
    const idx = p.likes.indexOf(userId);
    if (idx >= 0) {
      p.likes.splice(idx, 1);
      p.likesCount = Math.max(0, p.likesCount - 1);
      return { liked: false, likesCount: p.likesCount };
    }
    p.likes.push(userId);
    p.likesCount = (p.likesCount || 0) + 1;
    return { liked: true, likesCount: p.likesCount };
  },

  async unlockPost(postId, userId) {
    // In demo: mark as unlocked for this user (simple)
    const p = posts.find(x => x._id === postId);
    if (!p) throw new Error('Not found');
    if (!p.unlockedBy) p.unlockedBy = [];
    if (!p.unlockedBy.includes(userId)) p.unlockedBy.push(userId);
    return { success: true, unlocked: true };
  },

  // LIVE
  async getLiveSessions() {
    const lives = users.filter(u => u.role === 'creator' && u.isLive && u.status === 'active')
      .map(u => sanitizeUser(u));
    return { success: true, lives };
  },

  async startLive(userId, { title, category = 'Live', access = 'public' }) {
    const u = users.find(x => x._id === userId);
    if (!u || u.role !== 'creator') throw new Error('Only creators');
    u.isLive = true;
    u.liveTitle = title || 'Live now';
    u.liveCategory = category;
    u.liveAccess = access;
    u.liveStartedAt = new Date();
    u.liveViewers = 3;
    return { success: true, live: sanitizeUser(u) };
  },

  async stopLive(userId) {
    const u = users.find(x => x._id === userId);
    if (u) {
      u.isLive = false;
      u.liveViewers = 0;
    }
    return { success: true };
  },

  async getLiveById(id) {
    const u = users.find(x => x._id === id && x.isLive);
    return u ? { success: true, live: sanitizeUser(u) } : { success: false, message: 'Not live' };
  },

  // MESSAGES (demo realtime via socket still works)
  async getOrCreateConversation(userId, recipientId) {
    if (userId === recipientId) throw new Error('Cannot message self');
    let conv = conversations.find(c => c.participants.includes(userId) && c.participants.includes(recipientId));
    if (!conv) {
      conv = {
        _id: generateId('c'),
        participants: [userId, recipientId],
        updatedAt: new Date(),
        unread: {}
      };
      conversations.unshift(conv);
    }
    const parts = conv.participants.map(pid => users.find(u => u._id === pid)).filter(Boolean).map(sanitizeUser);
    return { success: true, conversation: { ...conv, participants: parts } };
  },

  async getConversations(userId) {
    const myConvs = conversations.filter(c => c.participants.includes(userId));
    const enriched = myConvs.map(c => {
      const parts = c.participants.map(pid => users.find(u => u._id === pid)).filter(Boolean).map(sanitizeUser);
      return { ...c, participants: parts };
    });
    return { success: true, conversations: enriched };
  },

  async getMessages(convId, userId) {
    const conv = conversations.find(c => c._id === convId);
    if (!conv || !conv.participants.includes(userId)) throw new Error('Not allowed');
    const msgs = messages.filter(m => m.conversation === convId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    const enriched = msgs.map(m => ({
      ...m,
      sender: sanitizeUser(users.find(u => u._id === m.sender))
    }));
    return { success: true, messages: enriched };
  },

  async sendMessage(convId, userId, text) {
    const conv = conversations.find(c => c._id === convId);
    if (!conv || !conv.participants.includes(userId)) throw new Error('Not allowed');
    const msg = {
      _id: generateId('m'),
      conversation: convId,
      sender: userId,
      text: text.slice(0, 800),
      createdAt: new Date(),
    };
    messages.push(msg);
    conv.updatedAt = new Date();
    return { success: true, message: { ...msg, sender: sanitizeUser(users.find(u => u._id === userId)) } };
  },

  // PAYMENTS / SUBSCRIPTIONS (MOCKED — always succeed for demo)
  async mockSubscribe(fanId, creatorId, method = 'demo') {
    const existing = subscriptions.find(s => s.fanId === fanId && s.creatorId === creatorId && s.activeUntil > Date.now());
    if (existing) return { success: true, alreadyActive: true };
    const sub = {
      _id: generateId('sub'),
      fanId,
      creatorId,
      method,
      amount: 25,
      activeUntil: Date.now() + 1000 * 3600 * 24 * 30,
      createdAt: new Date(),
    };
    subscriptions.push(sub);
    // give fan premium too for simplicity
    const fan = users.find(u => u._id === fanId);
    if (fan) fan.isPremium = true;
    return { success: true, subscription: sub };
  },

  async mockTip(creatorId, fanId, amount, message = '') {
    liveTips.push({ creatorId, fanId, amount: Number(amount) || 5, message, at: new Date() });
    const creator = users.find(u => u._id === creatorId);
    if (creator) {
      // simulate earnings
      creator.earnings = (creator.earnings || 0) + Number(amount);
    }
    return { success: true, tip: { amount, message } };
  },

  async getWallet(userId) {
    const u = users.find(x => x._id === userId) || {};
    return {
      success: true,
      balance: Math.floor((u.earnings || 1240) + 320),
      currency: 'USD',
      recent: liveTips.slice(-3).map(t => ({ ...t, type: 'tip' }))
    };
  },

  // ADMIN (demo)
  async getAdminStats() {
    return {
      success: true,
      stats: {
        users: users.length + 18300,
        creators: users.filter(u => u.role === 'creator').length + 1230,
        posts: posts.length + 12400,
        liveNow: users.filter(u => u.isLive).length,
        revenueUSD: 874200,
        subsActive: 3180,
      }
    };
  },

  async getAllUsers() {
    return { success: true, users: users.map(u => sanitizeUser(u, true)) };
  },

  // Helpers
  getUserByIdSync(id) { return users.find(u => u._id === id); },
  _dump() { return { users: users.length, posts: posts.length, convos: conversations.length }; },

  // POST COMMENTS (demo)
  async getPostComments(postId) {
    const p = posts.find(x => x._id === postId);
    if (!p) return { success: true, comments: [] };
    const enriched = (p.comments || []).map(c => ({
      ...c,
      user: sanitizeUser(users.find(u => u._id === c.user)) || { username: 'user' }
    }));
    return { success: true, comments: enriched };
  },

  async addPostComment(postId, userId, text) {
    const p = posts.find(x => x._id === postId);
    if (!p) throw new Error('Post not found');
    p.comments = p.comments || [];
    const comment = {
      _id: generateId('cmt'),
      user: userId,
      text: text.slice(0, 500),
      createdAt: new Date()
    };
    p.comments.push(comment);
    p.commentsCount = p.comments.length;
    return { success: true, comment: { ...comment, user: sanitizeUser(users.find(u => u._id === userId)) } };
  }
};

module.exports = Demo;