const express = require("express");
const http = require("http"); // Add this
const { Server } = require("socket.io"); // Add this
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");

// middlewares
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ========= Managing the Router Or Importing the Routers
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const chatRouter = require("./routes/chat"); // Add this

// ========= Using these Routes
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/api", chatRouter); // Add this

// ========= Create HTTP Server and Setup Socket.io
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, { // Initialize socket.io
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// ========= Socket.io Authentication Middleware
const jwt = require("jsonwebtoken");

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded._id;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

// ========= Socket.io Connection Handling
const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);
  onlineUsers.set(socket.userId, socket.id);

  // Join private chat rooms for existing connections
  socket.on("join-private-chat", (otherUserId) => {
    const roomId = [socket.userId, otherUserId].sort().join("_");
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  // Join global chat
  socket.on("join-global-chat", () => {
    socket.join("global-chat");
    console.log(`User ${socket.userId} joined global chat`);
  });


  // Handle private messages
  socket.on('private-message', async (data) => {
    const { toUserId, text, tempId } = data;
    const fromUserId = socket.userId;

    try {
      const Chat = require("./models/chat");
      const User = require("./models/user");
      const ConnectionRequest = require("./models/connectionRequest");

      // Check if users are connected
      const areConnected = async (userId1, userId2) => {
        const connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: userId1, toUserId: userId2, status: 'accepted' },
            { fromUserId: userId2, toUserId: userId1, status: 'accepted' }
          ]
        });
        return !!connection;
      };

      const isConnected = await areConnected(fromUserId, toUserId);
      if (!isConnected) {
        socket.emit('message-error', {
          error: 'You are not connected with this user',
          tempId: tempId,
          code: 'NOT_CONNECTED'
        });
        return;
      }

      // Find or create chat
      let chat = await Chat.findOne({
        type: "private",
        participants: { $all: [fromUserId, toUserId], $size: 2 },
      });

      if (!chat) {
        chat = new Chat({
          participants: [fromUserId, toUserId],
          type: "private",
          messages: [],
          unreadCount: new Map()
        });
        await chat.save();
      }

      // Add message with retry logic for version conflicts
      let retries = 3;
      let savedMessage = null;

      while (retries > 0) {
        try {
          savedMessage = await chat.addMessage(fromUserId, text);
          break;
        } catch (err) {
          if (err.name === 'VersionError' && retries > 1) {
            // Refresh the chat document
            chat = await Chat.findById(chat._id);
            retries--;
            continue;
          }
          throw err;
        }
      }

      const sender = await User.findById(fromUserId).select("firstName lastName photoUrl");

      const messageData = {
        _id: savedMessage._id,
        text: savedMessage.text,
        senderId: fromUserId,
        sender: sender,
        createdAt: savedMessage.createdAt,
        chatId: chat._id,
        tempId: tempId
      };

      // Send to recipient if online
      const recipientSocketId = onlineUsers.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("new-private-message", messageData);
      }

      // Confirm to sender
      socket.emit("message-sent", messageData);

    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit("message-error", {
        error: error.message,
        tempId: tempId,
        code: error.code || 'UNKNOWN'
      });
    }
  });

  // Handle global messages
  socket.on("global-message", async (data) => {
    const { text, tempId } = data;
    const fromUserId = socket.userId;

    try {
      const Chat = require("./models/chat");
      const User = require("./models/user");

      let chat = await Chat.findOne({ type: "global" });

      if (!chat) {
        chat = new Chat({
          type: "global",
          participants: [],
          messages: [],
          unreadCount: new Map(),
        });
      }

      // Add user to participants if not already
      if (!chat.participants.includes(fromUserId)) {
        chat.participants.push(fromUserId);
      }

      const newMessage = {
        senderId: fromUserId,
        text: text,
        readBy: [],
      };

      chat.messages.push(newMessage);
      chat.lastMessage = {
        text: text,
        senderId: fromUserId,
        timestamp: new Date(),
      };

      // Increment unread count for all participants except sender
      chat.participants.forEach((participantId) => {
        if (participantId.toString() !== fromUserId.toString()) {
          const currentUnread = chat.unreadCount.get(participantId.toString()) || 0;
          chat.unreadCount.set(participantId.toString(), currentUnread + 1);
        }
      });

      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];
      const sender = await User.findById(fromUserId).select(
        "firstName lastName photoUrl"
      );

      const messageData = {
        _id: savedMessage._id,
        text: savedMessage.text,
        senderId: fromUserId,
        sender: sender,
        createdAt: savedMessage.createdAt,
        chatId: chat._id,
        tempId: tempId,
      };

      // Broadcast to all in global chat
      io.to("global-chat").emit("new-global-message", messageData);
      socket.emit("message-sent", messageData);
    } catch (error) {
      console.error("Error sending global message:", error);
      socket.emit("message-error", {
        error: error.message,
        tempId: tempId,
      });
    }
  });

  // Handle typing indicators
  socket.on("typing-start", (data) => {
    const { toUserId, chatId } = data;
    const recipientSocketId = onlineUsers.get(toUserId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", {
        fromUserId: socket.userId,
        chatId: chatId,
        isTyping: true,
      });
    }
  });

  socket.on("typing-end", (data) => {
    const { toUserId, chatId } = data;
    const recipientSocketId = onlineUsers.get(toUserId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("user-typing", {
        fromUserId: socket.userId,
        chatId: chatId,
        isTyping: false,
      });
    }
  });

  // Handle mark as read
  socket.on("mark-read", async (data) => {
    const { chatId, messageIds } = data;
    try {
      const Chat = require("./models/chat");
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.userId,
      });

      if (chat) {
        // Mark messages as read
        let updatedCount = 0;
        for (let message of chat.messages) {
          if (message.senderId.toString() !== socket.userId.toString()) {
            const alreadyRead = message.readBy.some(
              (r) => r.userId.toString() === socket.userId.toString()
            );
            if (
              !alreadyRead &&
              (!messageIds || messageIds.includes(message._id.toString()))
            ) {
              message.readBy.push({
                userId: socket.userId,
                readAt: new Date(),
              });
              updatedCount++;
            }
          }
        }

        // Reset unread count for this user
        if (chat.unreadCount) {
          chat.unreadCount.set(socket.userId.toString(), 0);
        }

        await chat.save();

        // Notify sender that messages were read
        if (chat.type === "private" && updatedCount > 0) {
          const otherUser = chat.participants.find(
            (p) => p.toString() !== socket.userId.toString()
          );
          const otherSocketId = onlineUsers.get(otherUser);
          if (otherSocketId) {
            io.to(otherSocketId).emit("messages-read", {
              chatId: chatId,
              readBy: socket.userId,
              messageIds: messageIds,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
  });
});

// ========= Database Connection to the server
connectDB()
  .then(() => {
    console.log("Database connection is established...");
    server.listen(3000, () => {
      // Changed from app.listen to server.listen
      console.log("The server started successfully!....");
      console.log("Socket.io is ready for connections");
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected!!");
  });