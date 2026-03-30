const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('./models/chat');
const User = require('./models/user');

// Store online users and their socket IDs
const onlineUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

function setupSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true
    }
  });
  
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });
  
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Store user connection
    onlineUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);
    
    // Update user's last seen
    await User.findByIdAndUpdate(socket.userId, { 
      lastSeen: new Date(),
      isOnline: true 
    });
    
    // Broadcast online status to connections
    socket.broadcast.emit('user-online', { userId: socket.userId });
    
    // Join private rooms for all existing chats
    const userChats = await Chat.find({
      participants: socket.userId,
      isActive: true
    });
    
    userChats.forEach(chat => {
      if (chat.type === 'private') {
        const otherUser = chat.participants.find(p => p.toString() !== socket.userId);
        const roomId = [socket.userId, otherUser].sort().join('_');
        socket.join(roomId);
      } else if (chat.type === 'global') {
        socket.join('global-chat');
      }
    });
    
    // Handle private message
    socket.on('private-message', async (data) => {
      const { toUserId, text, tempId } = data;
      const fromUserId = socket.userId;
      
      try {
        // Find or create chat
        let chat = await Chat.findOne({
          type: 'private',
          participants: { $all: [fromUserId, toUserId], $size: 2 }
        });
        
        if (!chat) {
          chat = new Chat({
            participants: [fromUserId, toUserId],
            type: 'private',
            messages: [],
            unreadCount: new Map()
          });
        }
        
        // Create message
        const newMessage = {
          senderId: fromUserId,
          text: text,
          readBy: []
        };
        
        chat.messages.push(newMessage);
        
        // Update last message
        chat.lastMessage = {
          text: text,
          senderId: fromUserId,
          timestamp: new Date()
        };
        
        // Increment unread count for recipient
        const currentUnread = chat.unreadCount.get(toUserId) || 0;
        chat.unreadCount.set(toUserId, currentUnread + 1);
        
        await chat.save();
        
        const savedMessage = chat.messages[chat.messages.length - 1];
        
        // Get sender info
        const sender = await User.findById(fromUserId).select('firstName lastName photoUrl');
        
        const messageData = {
          _id: savedMessage._id,
          text: savedMessage.text,
          senderId: fromUserId,
          sender: sender,
          createdAt: savedMessage.createdAt,
          chatId: chat._id,
          tempId: tempId // For optimistic UI updates
        };
        
        // Send to recipient if online
        const recipientSocketId = onlineUsers.get(toUserId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new-private-message', messageData);
        }
        
        // Confirm to sender
        socket.emit('message-sent', messageData);
        
        // Also send to the room for multiple tabs
        const roomId = [fromUserId, toUserId].sort().join('_');
        io.to(roomId).emit('message-update', { chatId: chat._id });
        
      } catch (error) {
        console.error('Error sending private message:', error);
        socket.emit('message-error', { 
          error: error.message,
          tempId: tempId 
        });
      }
    });
    
    // Handle global message
    socket.on('global-message', async (data) => {
      const { text, tempId } = data;
      const fromUserId = socket.userId;
      
      try {
        let chat = await Chat.findOne({ type: 'global' });
        
        if (!chat) {
          chat = new Chat({
            type: 'global',
            participants: [],
            messages: [],
            unreadCount: new Map()
          });
        }
        
        // Add user to participants if not already
        if (!chat.participants.includes(fromUserId)) {
          chat.participants.push(fromUserId);
        }
        
        const newMessage = {
          senderId: fromUserId,
          text: text,
          readBy: []
        };
        
        chat.messages.push(newMessage);
        
        chat.lastMessage = {
          text: text,
          senderId: fromUserId,
          timestamp: new Date()
        };
        
        // Increment unread count for all participants except sender
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== fromUserId.toString()) {
            const currentUnread = chat.unreadCount.get(participantId.toString()) || 0;
            chat.unreadCount.set(participantId.toString(), currentUnread + 1);
          }
        });
        
        await chat.save();
        
        const savedMessage = chat.messages[chat.messages.length - 1];
        const sender = await User.findById(fromUserId).select('firstName lastName photoUrl');
        
        const messageData = {
          _id: savedMessage._id,
          text: savedMessage.text,
          senderId: fromUserId,
          sender: sender,
          createdAt: savedMessage.createdAt,
          chatId: chat._id,
          tempId: tempId
        };
        
        // Broadcast to all in global chat
        io.to('global-chat').emit('new-global-message', messageData);
        
        // Confirm to sender
        socket.emit('message-sent', messageData);
        
      } catch (error) {
        console.error('Error sending global message:', error);
        socket.emit('message-error', { 
          error: error.message,
          tempId: tempId 
        });
      }
    });
    
    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { toUserId, chatId } = data;
      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user-typing', {
          fromUserId: socket.userId,
          chatId: chatId,
          isTyping: true
        });
      }
    });
    
    socket.on('typing-end', (data) => {
      const { toUserId, chatId } = data;
      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipipientSocketId).emit('user-typing', {
          fromUserId: socket.userId,
          chatId: chatId,
          isTyping: false
        });
      }
    });
    
    // Handle mark as read
    socket.on('mark-read', async (data) => {
      const { chatId, messageIds } = data;
      try {
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.userId
        });
        
        if (chat) {
          const markedCount = await chat.markAsRead(socket.userId, messageIds);
          
          // Notify sender that messages were read
          if (chat.type === 'private' && markedCount > 0) {
            const otherUser = chat.getOtherParticipant(socket.userId);
            const otherSocketId = onlineUsers.get(otherUser);
            if (otherSocketId) {
              io.to(otherSocketId).emit('messages-read', {
                chatId: chatId,
                readBy: socket.userId,
                messageIds: messageIds
              });
            }
          }
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      const userId = socket.userId;
      console.log(`User disconnected: ${userId}`);
      
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);
      
      // Update user's last seen
      await User.findByIdAndUpdate(userId, { 
        lastSeen: new Date(),
        isOnline: false 
      });
      
      socket.broadcast.emit('user-offline', { userId: userId });
    });
  });
  
  return io;
}

module.exports = { setupSocket, onlineUsers };