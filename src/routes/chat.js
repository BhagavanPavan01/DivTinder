const express = require('express');
const router = express.Router();
const { userAuth } = require('../middlewares/auth');
const Chat = require('../models/chat');
const User = require('../models/user');
const ConnectionRequest = require('../models/connectionRequest');

// Helper function to check if users are connected
async function areConnected(userId1, userId2) {
  const connection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userId1, toUserId: userId2, status: 'accepted' },
      { fromUserId: userId2, toUserId: userId1, status: 'accepted' }
    ]
  });
  return !!connection;
}

// ==================== CHAT API ENDPOINTS ====================

// GET /api/chats - Get all chats for logged-in user (WhatsApp sidebar)
router.get('/chats', userAuth, async (req, res) => {
  try {
    const chats = await Chat.getUserChats(req.user._id);

    const formattedChats = [];

    for (const chat of chats) {
      // Get the other participant
      const otherUser = chat.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );

      if (!otherUser && chat.type !== 'group') continue;

      // For private chats, verify connection status
      let connectionStatus = 'connected';
      if (chat.type === 'private') {
        const isConnected = await areConnected(req.user._id, otherUser._id);
        connectionStatus = isConnected ? 'connected' : 'disconnected';

        // Don't show disconnected chats with no messages
        if (!isConnected && chat.messages.length === 0) {
          continue;
        }
      }

      const unreadCount = chat.getUnreadCount(req.user._id);

      formattedChats.push({
        chatId: chat._id,
        type: chat.type,
        groupName: chat.groupName,
        groupAvatar: chat.groupAvatar,
        user: chat.type === 'private' ? {
          _id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          photoUrl: otherUser.photoUrl,
          emailId: otherUser.emailId
        } : null,
        lastMessage: chat.lastMessage ? {
          text: chat.lastMessage.text,
          senderName: chat.lastMessage.senderName,
          timestamp: chat.lastMessage.timestamp,
          isOwn: chat.lastMessage.senderId?.toString() === req.user._id.toString(),
          isDeleted: chat.lastMessage.isDeleted || false
        } : null,
        unreadCount: unreadCount,
        updatedAt: chat.updatedAt,
        connectionStatus,
        isPinned: chat.pinnedBy?.includes(req.user._id) || false,
        isMuted: chat.mutedBy?.some(m => m.userId.toString() === req.user._id.toString() && (!m.until || m.until > new Date()))
      });
    }

    // Sort: Pinned first, then by updatedAt
    formattedChats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json({
      success: true,
      data: formattedChats
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chats/:chatId - Get specific chat with messages
router.get('/chats/:chatId', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    }).populate('participants', 'firstName lastName photoUrl emailId');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get other user info for private chats
    const otherUser = chat.type === 'private' ? chat.participants.find(
      p => p._id.toString() !== req.user._id.toString()
    ) : null;

    // Check connection status for private chats
    let connectionStatus = 'connected';
    if (chat.type === 'private' && otherUser) {
      const isConnected = await areConnected(req.user._id, otherUser._id);
      connectionStatus = isConnected ? 'connected' : 'disconnected';
    }

    // Get messages with pagination (oldest first - for proper display)
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalMessages = chat.messages.length;

    // Get paginated messages (oldest first)
    const paginatedMessages = chat.messages.slice(skip, skip + parseInt(limit));

    // Format messages
    const formattedMessages = paginatedMessages.map(msg => ({
      _id: msg._id,
      text: msg.text,
      senderId: msg.senderId,
      createdAt: msg.createdAt,
      isRead: msg.senderId?.toString() === req.user._id.toString()
        ? msg.readBy?.some(r => r.userId?.toString() !== req.user._id.toString())
        : msg.readBy?.some(r => r.userId?.toString() === req.user._id.toString()),
      isDelivered: msg.senderId?.toString() === req.user._id.toString()
        ? msg.deliveredTo?.some(d => d.userId?.toString() !== req.user._id.toString())
        : msg.deliveredTo?.some(d => d.userId?.toString() === req.user._id.toString()),
      isOwn: msg.senderId?.toString() === req.user._id.toString(),
      isEdited: msg.isEdited || false,
      isDeleted: msg.isDeleted || false,
      replyTo: msg.replyTo,
      attachments: msg.attachments || []
    }));

    // Mark messages as read (background task, don't await)
    chat.markAsRead(req.user._id).catch(console.error);

    res.json({
      success: true,
      data: {
        chatId: chat._id,
        type: chat.type,
        groupName: chat.groupName,
        groupAvatar: chat.groupAvatar,
        groupAdmins: chat.groupAdmins,
        user: otherUser,
        messages: formattedMessages,
        connectionStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / parseInt(limit)),
          hasMore: skip + parseInt(limit) < totalMessages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/private/:userId - Create or get private chat
router.post('/chats/private/:userId', userAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const otherUser = await User.findById(userId).select('firstName lastName photoUrl emailId');
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Bypass connection status checks to allow chatting with anyone
    const isConnected = true;

    const chat = await Chat.findOrCreatePrivateChat(req.user._id, userId);

    const otherUserData = chat.participants.find(
      p => p._id.toString() !== req.user._id.toString()
    );

    const formattedMessages = chat.messages.map(msg => ({
      _id: msg._id,
      text: msg.text,
      senderId: msg.senderId,
      createdAt: msg.createdAt,
      isRead: msg.senderId?.toString() === req.user._id.toString()
        ? msg.readBy?.some(r => r.userId?.toString() !== req.user._id.toString())
        : msg.readBy?.some(r => r.userId?.toString() === req.user._id.toString()),
      isOwn: msg.senderId?.toString() === req.user._id.toString(),
      isEdited: msg.isEdited || false,
      isDeleted: msg.isDeleted || false
    }));

    res.json({
      success: true,
      data: {
        chatId: chat._id,
        type: chat.type,
        user: otherUserData,
        messages: formattedMessages,
        connectionStatus: 'connected'
      }
    });
  } catch (error) {
    console.error('Error creating private chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/:chatId/messages - Send message to chat
router.post('/chats/:chatId/messages', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text, replyTo, attachments } = req.body;

    if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message text or attachment is required' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }

    // Bypass connection status checks to send messages to anyone

    const newMessage = await chat.addMessage(req.user._id, text?.trim() || '', replyTo, attachments || []);
    const sender = await User.findById(req.user._id).select('firstName lastName photoUrl');

    res.json({
      success: true,
      data: {
        _id: newMessage._id,
        text: newMessage.text,
        sender: sender,
        senderId: req.user._id,
        createdAt: newMessage.createdAt,
        isRead: false,
        isDelivered: false,
        isEdited: false,
        isOwn: true,
        replyTo: newMessage.replyTo,
        attachments: newMessage.attachments
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:chatId/read - Mark messages as read
router.put('/chats/:chatId/read', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const markedCount = await chat.markAsRead(req.user._id, messageIds);

    res.json({
      success: true,
      message: `${markedCount} messages marked as read`,
      count: markedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:chatId/delivered - Mark messages as delivered
router.put('/chats/:chatId/delivered', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const markedCount = await chat.markAsDelivered(req.user._id, messageIds);

    res.json({
      success: true,
      message: `${markedCount} messages marked as delivered`,
      count: markedCount
    });
  } catch (error) {
    console.error('Error marking messages as delivered:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:chatId/messages/:messageId - Delete message
router.delete('/chats/:chatId/messages/:messageId', userAuth, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const deletedMessage = await chat.deleteMessage(req.user._id, messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: deletedMessage
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:chatId/pin - Pin/Unpin chat
router.put('/chats/:chatId/pin', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { pin } = req.body; // true = pin, false = unpin

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (pin) {
      if (!chat.pinnedBy.includes(req.user._id)) {
        chat.pinnedBy.push(req.user._id);
      }
    } else {
      chat.pinnedBy = chat.pinnedBy.filter(id => id.toString() !== req.user._id.toString());
    }

    await chat.save();

    res.json({
      success: true,
      message: pin ? 'Chat pinned' : 'Chat unpinned'
    });
  } catch (error) {
    console.error('Error pinning chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:chatId/mute - Mute/Unmute chat
router.put('/chats/:chatId/mute', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { mute, until } = req.body; // mute: true/false, until: Date (optional)

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (mute) {
      const muteUntil = until ? new Date(until) : new Date(Date.now() + 8 * 60 * 60 * 1000); // Default 8 hours
      const existingMute = chat.mutedBy.find(m => m.userId.toString() === req.user._id.toString());

      if (existingMute) {
        existingMute.until = muteUntil;
      } else {
        chat.mutedBy.push({ userId: req.user._id, until: muteUntil });
      }
    } else {
      chat.mutedBy = chat.mutedBy.filter(m => m.userId.toString() !== req.user._id.toString());
    }

    await chat.save();

    res.json({
      success: true,
      message: mute ? 'Chat muted' : 'Chat unmuted'
    });
  } catch (error) {
    console.error('Error muting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:chatId - Delete/Archive chat
router.delete('/chats/:chatId', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Archive instead of delete (soft delete)
    if (!chat.archivedBy) {
      chat.archivedBy = [];
    }

    if (!chat.archivedBy.includes(req.user._id)) {
      chat.archivedBy.push(req.user._id);
    }

    await chat.save();

    res.json({
      success: true,
      message: 'Chat archived successfully'
    });
  } catch (error) {
    console.error('Error archiving chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:chatId/delete - Permanent delete chat
router.delete('/chats/:chatId/delete', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Permanently delete the chat
    await Chat.findByIdAndDelete(chatId);

    res.json({
      success: true,
      message: 'Chat permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/group - Create a group chat
router.post('/chats/group', userAuth, async (req, res) => {
  try {
    const { name, participantIds, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // Ensure current user is in participants list
    const participants = Array.from(
      new Set([...participantIds.map(id => id.toString()), req.user._id.toString()])
    ).sort();

    const chat = new Chat({
      participants,
      type: 'group',
      groupName: name.trim(),
      groupAvatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      groupAdmin: req.user._id,
      groupAdmins: [req.user._id],
      messages: [],
      unreadCount: new Map()
    });

    await chat.save();
    await chat.populate('participants', 'firstName lastName photoUrl emailId');

    res.json({
      success: true,
      data: {
        chatId: chat._id,
        type: chat.type,
        groupName: chat.groupName,
        groupAvatar: chat.groupAvatar,
        groupAdmins: chat.groupAdmins,
        participants: chat.participants,
        messages: []
      }
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;