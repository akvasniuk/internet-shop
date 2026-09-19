const { Server } = require("socket.io");

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const OAuth = require("../models/OAuth");
const { verifyToken } = require("../helpers/auth.helper");

const onlineUsers = new Map();

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const isTokenValid = await verifyToken(token);

      if (!isTokenValid) {
        return next(new Error("Authentication error: token not valid"));
      }

      const tokenObject = await OAuth.findOne({ accessToken: token });

      if (!tokenObject) {
        return next(new Error("Wrong token"));
      }

      socket.user = tokenObject.user;
      next();
    } catch (err) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id || socket.user._id;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    broadcastOnlineAdmins(io);

    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(conversationId);
    });

    socket.on("send_message", async ({ conversationId, text }) => {
      try {
        if (!text || !text.trim() || !conversationId) return;

        const newMessage = await Message.create({
          conversationId,
          sender: userId,
          text: text.trim(),
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text.trim(),
          updatedAt: new Date(),
        });

        const populatedMessage = await newMessage.populate(
          "sender",
          "firstname lastname email role",
        );

        io.to(conversationId).emit("receive_message", populatedMessage);
      } catch (error) {
        console.error("Socket send_message error:", error);
        socket.emit("error_message", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      broadcastOnlineAdmins(io);
    });
  });
}

async function broadcastOnlineAdmins(io) {
  try {
    const onlineUserIds = Array.from(onlineUsers.keys());
    const onlineAdmins = await User.find(
      { _id: { $in: onlineUserIds }, role: "ADMIN" },
      "_id firstname lastname email",
    );

    io.emit("online_admins_updated", onlineAdmins);
  } catch (error) {
    console.error("broadcastOnlineAdmins error:", error);
  }
}

module.exports = { initSocket };
