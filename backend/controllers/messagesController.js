const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const socketManager = require('../socket');
const { createNotification } = require('./notificationController');
const jwt = require('jsonwebtoken');
const Demo = require('../demoStore');

exports.createOrGetConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ success: false, message: 'recipientId required' });
    const myId = req.user.id || req.user._id;
    if (recipientId === String(myId)) return res.status(400).json({ success: false, message: 'Cannot message yourself' });

    if (global.USE_DEMO && Demo) {
      const data = await Demo.getOrCreateConversation(String(myId), String(recipientId));
      return res.json(data);
    }

    // Find existing conversation between the two
    let conv = await Conversation.findOne({ participants: { $all: [req.user._id, recipientId] } });
    if (!conv) {
      conv = await Conversation.create({ participants: [req.user._id, recipientId], unread: {} });
    }
    await conv.populate('participants', 'username avatar');
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const myId = req.user.id || req.user._id;
    if (global.USE_DEMO && Demo) {
      const data = await Demo.getConversations(String(myId));
      return res.json(data);
    }
    const convs = await Conversation.find({ participants: req.user._id }).sort({ updatedAt: -1 }).limit(200).populate('participants', 'username avatar');
    res.json({ success: true, conversations: convs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const myId = req.user.id || req.user._id;
    if (global.USE_DEMO && Demo) {
      const data = await Demo.getMessages(id, String(myId));
      return res.json(data);
    }
    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!conv.participants.map(p => String(p)).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }
    const msgs = await Message.find({ conversation: id }).sort({ createdAt: 1 }).populate('sender', 'username avatar');
    res.json({ success: true, messages: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params; // conversation id
    const { text, attachments } = req.body;
    const myId = req.user.id || req.user._id;

    if (global.USE_DEMO && Demo) {
      const data = await Demo.sendMessage(id, String(myId), text || '');
      // also broadcast via socket
      const io = socketManager.getIO ? socketManager.getIO() : null;
      if (io) io.to(`conversation:${id}`).emit('message:new', data.message);
      return res.json(data);
    }

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (!conv.participants.map(p => String(p)).includes(String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Not a participant' });
    }
    const msg = await Message.create({ conversation: id, sender: req.user._id, text: text || '', attachments: attachments || [] });

    // update conversation lastMessage and unread counts
    conv.lastMessage = { text: msg.text, sender: req.user._id, createdAt: msg.createdAt };
    // increment unread for other participants
    conv.participants.forEach(part => {
      const pid = String(part);
      if (pid !== String(req.user._id)) {
        const prev = conv.unread.get(pid) || 0;
        conv.unread.set(pid, prev + 1);
      }
    });
    await conv.save();

    const populated = await Message.findById(msg._id).populate('sender', 'username avatar');

    const textSnippet = msg.text ? msg.text.substring(0, 120) : 'Sent you a message';
    const recipients = conv.participants.filter(p => String(p) !== String(req.user._id));
    for (const recipientId of recipients) {
      try {
        const recipient = await User.findById(recipientId);
        if (recipient && recipient.notificationPreferences?.notifMessage !== false) {
          await createNotification({
            recipient: recipient._id,
            sender: req.user._id,
            type: 'message',
            title: `New message from ${req.user.username}`,
            message: textSnippet,
            link: `/pages/messages.html?conversation=${conv._id}`,
          });
        }
      } catch (e) {
        console.error('Notification create failed', e);
      }
    }

    // Emit real-time event to participants
    try {
      const io = socketManager.getIO();
      if (io) {
        conv.participants.forEach(p => {
          const pid = String(p);
          io.to(`user:${pid}`).emit('message', { conversationId: conv._id, message: populated });
        });
        io.to(`conversation:${conv._id}`).emit('conversation:update', { conversationId: conv._id, lastMessage: conv.lastMessage });
      }
    } catch (e) { console.error('Socket emit error', e); }

    res.json({ success: true, message: populated, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params; // conversation id
    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    conv.unread.set(String(req.user._id), 0);
    await conv.save();
    res.json({ success: true, message: 'Marked read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
