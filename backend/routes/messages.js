const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const msgs = require('../controllers/messagesController');

// Create or get conversation with recipient
router.post('/conversations', protect, msgs.createOrGetConversation);
// List conversations for current user
router.get('/conversations', protect, msgs.getConversations);
// Get messages for a conversation
router.get('/conversations/:id/messages', protect, msgs.getMessages);
// Send message in a conversation
router.post('/conversations/:id/messages', protect, msgs.sendMessage);
// Mark conversation as read for current user
router.post('/conversations/:id/read', protect, msgs.markRead);

module.exports = router;
