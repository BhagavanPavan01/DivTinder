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

// ==================== WHATSAPP-STYLE API ENDPOINTS ====================

// GET /api/chat - Get all chats for sidebar (WhatsApp style)
router.get('/chat', userAuth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      isActive: true
    })
    .populate('participants', 'firstName lastName photoUrl gender age emailId')
    .populate('lastMessage.senderId', 'firstName lastName photoUrl')
    .sort({ updatedAt: -1 });
    
    // Format chats with other user info
    const formattedChats = [];
    
    for (const chat of chats) {
      // Get the other participant
      const otherUser = chat.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      
      if (!otherUser) continue;
      
      // For private chats, verify connection status
      let isConnected = true;
      let connectionStatus = 'active';
      
      if (chat.type === 'private') {
        const connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: req.user._id, toUserId: otherUser._id, status: 'accepted' },
            { fromUserId: otherUser._id, toUserId: req.user._id, status: 'accepted' }
          ]
        });
        
        isConnected = !!connection;
        connectionStatus = isConnected ? 'connected' : 'disconnected';
        
        // Don't show disconnected chats unless they have message history
        if (!isConnected && chat.messages.length === 0) {
          continue;
        }
      }
      
      formattedChats.push({
        chatId: chat._id,
        type: chat.type,
        user: {
          _id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          photoUrl: otherUser.photoUrl,
          emailId: otherUser.emailId,
          gender: otherUser.gender,
          age: otherUser.age
        },
        lastMessage: chat.lastMessage ? {
          text: chat.lastMessage.text,
          senderId: chat.lastMessage.senderId,
          senderName: chat.lastMessage.senderId?.firstName || 'Unknown',
          createdAt: chat.lastMessage.createdAt,
          isOwn: chat.lastMessage.senderId?._id?.toString() === req.user._id.toString()
        } : null,
        unreadCount: chat.getUnreadCount ? chat.getUnreadCount(req.user._id) : 0,
        updatedAt: chat.updatedAt,
        connectionStatus
      });
    }
    
    res.json({
      success: true,
      data: formattedChats
    });
  } catch (error) {
    console.error('Error fetching chat list:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/:chatId - Get specific chat with messages
router.get('/chat/:chatId', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id,
      isActive: true
    }).populate('participants', 'firstName lastName photoUrl gender age emailId');
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Get other user info
    const otherUser = chat.participants.find(
      p => p._id.toString() !== req.user._id.toString()
    );
    
    // Check connection status
    let connectionStatus = 'active';
    if (chat.type === 'private') {
      const connection = await ConnectionRequest.findOne({
        $or: [
          { fromUserId: req.user._id, toUserId: otherUser._id, status: 'accepted' },
          { fromUserId: otherUser._id, toUserId: req.user._id, status: 'accepted' }
        ]
      });
      connectionStatus = connection ? 'connected' : 'disconnected';
    }
    
    // Get messages with pagination (oldest first)
    let messages = [...chat.messages];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalMessages = messages.length;
    
    // Get paginated messages
    const paginatedMessages = messages.slice(skip, skip + parseInt(limit));
    
    // Populate sender info for messages
    const populatedMessages = await Promise.all(
      paginatedMessages.map(async (msg) => {
        const sender = await User.findById(msg.senderId).select('firstName lastName photoUrl');
        const isReadByCurrentUser = msg.readBy.some(
          r => r.userId.toString() === req.user._id.toString()
        );
        
        return {
          _id: msg._id,
          text: msg.text,
          sender: sender || { firstName: 'Unknown', lastName: '' },
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          readBy: msg.readBy,
          isRead: isReadByCurrentUser,
          isEdited: msg.isEdited || false,
          editedAt: msg.editedAt,
          isOwn: msg.senderId.toString() === req.user._id.toString()
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        chatId: chat._id,
        type: chat.type,
        user: otherUser,
        messages: populatedMessages,
        connectionStatus,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/private/:userId - Create or get private chat
router.post('/chat/private/:userId', userAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const otherUser = await User.findById(userId).select('firstName lastName photoUrl emailId gender age');
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if users are connected
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: req.user._id, toUserId: userId, status: 'accepted' },
        { fromUserId: userId, toUserId: req.user._id, status: 'accepted' }
      ]
    });
    
    if (!connection) {
      return res.status(403).json({ 
        error: 'You can only chat with your accepted connections',
        code: 'NOT_CONNECTED'
      });
    }
    
    // Find or create private chat
    let chat = await Chat.findOne({
      type: 'private',
      participants: { $all: [req.user._id, userId], $size: 2 },
      isActive: true
    }).populate('participants', 'firstName lastName photoUrl emailId gender age');
    
    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        type: 'private',
        participants: [req.user._id, userId],
        messages: [],
        createdBy: req.user._id
      });
      await chat.populate('participants', 'firstName lastName photoUrl emailId gender age');
    }
    
    // Get messages in chronological order
    const messages = chat.messages || [];
    
    // Mark messages as read when opening chat
    if (chat.markAsRead) {
      await chat.markAsRead(req.user._id);
    }
    
    // Get other user info
    const chatOtherUser = chat.participants.find(
      p => p._id.toString() !== req.user._id.toString()
    );
    
    res.json({
      success: true,
      data: {
        chatId: chat._id,
        type: chat.type,
        user: chatOtherUser,
        messages: messages.map(msg => ({
          ...msg.toObject(),
          isOwn: msg.senderId.toString() === req.user._id.toString()
        })),
        connectionStatus: 'connected'
      }
    });
  } catch (error) {
    console.error('Error creating private chat:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      try {
        const existingChat = await Chat.findOne({
          type: 'private',
          participants: { $all: [req.user._id, req.params.userId], $size: 2 },
          isActive: true
        }).populate('participants', 'firstName lastName photoUrl emailId gender age');
        
        if (existingChat) {
          const otherUser = existingChat.participants.find(
            p => p._id.toString() !== req.user._id.toString()
          );
          
          return res.json({
            success: true,
            data: {
              chatId: existingChat._id,
              type: existingChat.type,
              user: otherUser,
              messages: existingChat.messages.map(msg => ({
                ...msg.toObject(),
                isOwn: msg.senderId.toString() === req.user._id.toString()
              })),
              connectionStatus: 'connected'
            }
          });
        }
      } catch (fetchError) {
        console.error('Error fetching existing chat:', fetchError);
      }
    }
    
    res.status(500).json({ error: 'Failed to create or fetch chat. Please try again.' });
  }
});

// POST /api/chat/:chatId/message - Send message to chat
router.post('/chat/:chatId/message', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Check if user is participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }
    
    // For private chats, verify they are still connected
    if (chat.type === 'private') {
      const otherUserId = chat.participants.find(id => id.toString() !== req.user._id.toString());
      const connection = await ConnectionRequest.findOne({
        $or: [
          { fromUserId: req.user._id, toUserId: otherUserId, status: 'accepted' },
          { fromUserId: otherUserId, toUserId: req.user._id, status: 'accepted' }
        ]
      });
      
      if (!connection) {
        return res.status(403).json({ 
          error: 'You are no longer connected with this user',
          code: 'NOT_CONNECTED'
        });
      }
    }
    
    // Add message
    const newMessage = await chat.addMessage(req.user._id, text.trim());
    
    // Get sender info
    const sender = await User.findById(req.user._id).select('firstName lastName photoUrl');
    
    res.json({
      success: true,
      data: {
        _id: newMessage._id,
        text: newMessage.text,
        sender: sender,
        senderId: req.user._id,
        createdAt: newMessage.createdAt,
        readBy: newMessage.readBy,
        isRead: false,
        isEdited: false,
        isOwn: true
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    
    if (error.name === 'VersionError') {
      return res.status(409).json({ 
        error: 'Chat was modified. Please refresh and try again.',
        code: 'VERSION_CONFLICT'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chat/:chatId/read - Mark messages as read
router.put('/chat/:chatId/read', userAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const markedCount = await chat.markAsRead(req.user._id);
    
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

// DELETE /api/chat/:chatId/message/:messageId - Delete message (optional)
router.delete('/chat/:chatId/message/:messageId', userAuth, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    
    const chat = await Chat.findOne({
      _id: chatId,
      participants: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Only allow deletion if user is the sender
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Check if message is within time limit (e.g., 5 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (messageAge > fiveMinutes) {
      return res.status(403).json({ error: 'Messages can only be deleted within 5 minutes of sending' });
    }
    
    // Soft delete by marking as deleted
    message.text = 'This message was deleted';
    message.isDeleted = true;
    await chat.save();
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;