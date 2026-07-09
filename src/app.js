const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");

// Middlewares
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Import Routes
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat");

// Use Routes
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/api", chatRouter);

// Create HTTP Server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.io Authentication
const jwt = require("jsonwebtoken");

// Debug: Check if JWT_SECRET is loaded
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "✅ YES" : "❌ NO");

io.use((socket, next) => {
  // Try multiple ways to get the token
  let token = null;

  // 1. Try from auth object (most common for socket.io)
  if (socket.handshake.auth && socket.handshake.auth.token) {
    token = socket.handshake.auth.token;
    console.log("Token found in auth");
  }

  // 2. Try from headers Authorization
  if (!token && socket.handshake.headers.authorization) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log("Token found in Authorization header");
    }
  }

  // 3. Try from cookies
  if (!token && socket.handshake.headers.cookie) {
    const cookies = socket.handshake.headers.cookie;
    const match = cookies.match(/token=([^;]+)/);
    if (match) {
      token = match[1];
      console.log("Token found in cookies");
    }
  }

  if (!token) {
    console.log('❌ No token provided for socket connection');
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables!');
      return next(new Error("Server configuration error"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded._id;
    console.log(`✅ Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (err) {
    console.error('❌ Socket authentication error:', err.message);
    console.error('Token received:', token.substring(0, 20) + '...');
    return next(new Error(`Authentication error: ${err.message}`));
  }
});

// Store online users
const onlineUsers = new Map();
const userSockets = new Map();
const userChatRooms = new Map();

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.userId}`);
  onlineUsers.set(socket.userId, socket.id);
  userSockets.set(socket.id, socket.userId);

  socket.broadcast.emit("user-online", { userId: socket.userId });
  socket.join(`user_${socket.userId}`);

  // Load user's existing chats
  (async () => {
    try {
      const Chat = require("./models/chat");
      const userChats = await Chat.find({
        participants: socket.userId,
        isActive: true
      });

      for (const chat of userChats) {
        const roomId = `chat_${chat._id}`;
        socket.join(roomId);
        if (!userChatRooms.has(socket.userId)) {
          userChatRooms.set(socket.userId, new Set());
        }
        userChatRooms.get(socket.userId).add(roomId);
        console.log(`User ${socket.userId} joined room: ${roomId}`);
      }
    } catch (error) {
      console.error('Error loading user chats:', error);
    }
  })();

  // Join chat room
  socket.on("join-chat-room", (chatId) => {
    const roomId = `chat_${chatId}`;
    socket.join(roomId);
    if (!userChatRooms.has(socket.userId)) {
      userChatRooms.set(socket.userId, new Set());
    }
    userChatRooms.get(socket.userId).add(roomId);
    console.log(`User ${socket.userId} joined chat room: ${roomId}`);
  });

  // Leave chat room
  socket.on("leave-chat-room", (chatId) => {
    const roomId = `chat_${chatId}`;
    socket.leave(roomId);
    if (userChatRooms.has(socket.userId)) {
      userChatRooms.get(socket.userId).delete(roomId);
    }
    console.log(`User ${socket.userId} left chat room: ${roomId}`);
  });

  // Send message
  socket.on("send-message", async (data) => {
    const { chatId, text, replyTo, tempId } = data;
    const fromUserId = socket.userId;

    try {
      const Chat = require("./models/chat");
      const User = require("./models/user");
      const ConnectionRequest = require("./models/connectionRequest");

      const chat = await Chat.findById(chatId);
      if (!chat) {
        socket.emit("message-error", { tempId, error: "Chat not found" });
        return;
      }

      if (!chat.participants.includes(fromUserId)) {
        socket.emit("message-error", { tempId, error: "Not a participant" });
        return;
      }

      // Bypass connection status checks to allow chatting with anyone
      const connection = true;

      const savedMessage = await chat.addMessage(fromUserId, text, replyTo);
      const sender = await User.findById(fromUserId).select("firstName lastName photoUrl");

      const messageData = {
        _id: savedMessage._id,
        text: savedMessage.text,
        senderId: fromUserId,
        sender: sender,
        createdAt: savedMessage.createdAt,
        chatId: chat._id,
        tempId: tempId,
        replyTo: savedMessage.replyTo,
        isOwn: true
      };

      const roomId = `chat_${chat._id}`;
      io.to(roomId).emit("new-message", messageData);
      socket.emit("message-sent", messageData);

    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("message-error", { tempId, error: error.message });
    }
  });

  // Typing indicators
  socket.on("typing-start", ({ chatId }) => {
    const roomId = `chat_${chatId}`;
    socket.to(roomId).emit("user-typing", {
      userId: socket.userId,
      chatId: chatId,
      isTyping: true
    });
  });

  socket.on("typing-end", ({ chatId }) => {
    const roomId = `chat_${chatId}`;
    socket.to(roomId).emit("user-typing", {
      userId: socket.userId,
      chatId: chatId,
      isTyping: false
    });
  });

  // Mark as read
  socket.on("mark-read", async ({ chatId, messageIds }) => {
    try {
      const Chat = require("./models/chat");
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.userId
      });

      if (chat) {
        const markedCount = await chat.markAsRead(socket.userId, messageIds);

        if (markedCount > 0) {
          const roomId = `chat_${chatId}`;
          socket.to(roomId).emit("messages-read", {
            chatId: chatId,
            readBy: socket.userId,
            messageIds: messageIds
          });
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Delete message
  socket.on("delete-message", async ({ chatId, messageId }) => {
    try {
      const Chat = require("./models/chat");
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.userId
      });

      if (chat) {
        await chat.deleteMessage(socket.userId, messageId);

        const roomId = `chat_${chatId}`;
        io.to(roomId).emit("message-deleted", {
          chatId: chatId,
          messageId: messageId,
          deletedBy: socket.userId
        });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });

  // Get user status
  socket.on("get-user-status", (userId) => {
    const isOnline = onlineUsers.has(userId);
    socket.emit("user-status", {
      userId: userId,
      isOnline: isOnline
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
    userSockets.delete(socket.id);

    if (userChatRooms.has(socket.userId)) {
      userChatRooms.delete(socket.userId);
    }

    socket.broadcast.emit("user-offline", { userId: socket.userId });
  });
});

app.set("io", io);
global.onlineUsers = onlineUsers;

// =========Database Connection this is for normal development phase in localhost

// connectDB()
//   .then(() => {
//     console.log("✅ Database connection is established...");
//     server.listen(3000, () => {
//       console.log("🚀 Server started successfully on port 3000!");
//       console.log("🔌 Socket.io is ready for connections");
//     });
//   })
//   .catch((err) => {
//     console.error("❌ Database cannot be connected!!", err);
//   });


// =========Database Connection  this is for Render .env configuration
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    console.log("✅ Database connection is established...");

    server.listen(PORT, () => {
      console.log(`🚀 Server started successfully on port ${PORT}!`);
      console.log("🔌 Socket.io is ready for connections");
    });
  })
  .catch((err) => {
    console.error("❌ Database cannot be connected!!", err);
  });