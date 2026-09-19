const Message = require("../models/Message");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { sendJson } = require("../helpers/response");
const idValidator = require("../validators/id.validator");

async function getOrCreateConversation(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const { targetUserId } = JSON.parse(body || "{}");
      const { error } = await idValidator.validate(targetUserId);

      if (error) {
        return sendJson(res, 400, { message: "User id is not valid" });
      }

      const { user } = req;

      const currentUserId = user._id;
      const currentUserRole = user.role;

      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        return sendJson(res, 400, { message: `No user with id ${adminId}` });
      }

      let clientId, adminId;

      if (currentUserRole === "ADMIN") {
        adminId = currentUserId;
        clientId = targetUserId;
      } else {
        clientId = currentUserId;
        adminId = targetUserId;
      }

      let conversation = await Conversation.findOne({
        client: clientId,
        admin: adminId,
      })
        .populate("client", "firstname, lastname, email")
        .populate("admin", "firstname lastname email");

      if (!conversation) {
        conversation = await Conversation.create({
          client: clientId,
          admin: adminId,
        });

        conversation = await conversation.populate([
          { path: "client", select: "firstname lastname email" },
          { path: "admin", select: "firstname lastname email" },
        ]);
      }

      return sendJson(res, 200, { success: true, conversation });
    } catch (error) {
      return sendJson(res, 500, { message: error.message });
    }
  });
}

async function getUserConversations(req, res) {
  try {
    const { user } = req;

    const userId = user._id;
    const userRole = user.role;

    const filter =
      userRole === "ADMIN" ? { admin: userId } : { client: userId };

    const conversations = await Conversation.find(filter)
      .populate("client", "firstname lastname email")
      .populate("admin", "firstname lastname email")
      .sort({ updatedAt: -1 });

    return sendJson(res, 200, { success: true, conversations });
  } catch (error) {
    return sendJson(res, 500, { message: error.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { user } = req;
    const userId = user._id;

    const { conversationId, text } = req.body;

    if (!conversationId || !text || !text.trim()) {
      return sendJson(res, 400, {
        message: "conversationId and text are required",
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return sendJson(res, 404, { message: "Conversation not found" });
    }

    const newMessage = await Message.create({
      conversationId,
      sender: userId,
      text: text.trim(),
    });

    conversation.lastMessage = text.trim();
    await conversation.save();

    const populatedMessage = await newMessage.populate(
      "sender",
      "firstname lastname role email",
    );

    return sendJson(res, 201, { success: true, populatedMessage });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return sendJson(res, 500, { message: "Failed to send message" });
  }
}

async function getMessagesByConversation(req, res) {
  const parts = req.url.split("/");

  if (parts[1] === "chat" && parts[2] === "messages" && parts[3]) {
    try {
      const conversationId = parts[3];

      const { error } = await idValidator.validate(conversationId);

      if (error) {
        return sendJson(res, 400, { message: "Conversation id is not valid" });
      }
      const userId = req.user.id;
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return sendJson(res, 404, { message: "Conversation not found" });
      }

      const isParticipant =
        conversation.client.toString() === userId.toString() ||
        conversation.admin.toString() === userId.toString();

      if (!isParticipant && req.user.role !== "ADMIN") {
        return sendJson(res, 404, { message: "Access denied to this chat" });
      }

      const messages = await Message.find({ conversationId })
        .populate("sender", "firstname lastname role email")
        .sort({ createdAt: 1 });

      await Message.updateMany(
        { conversationId, sender: { $ne: userId }, isRead: false },
        { $set: { isRead: true } },
      );

      return sendJson(res, 200, { success: true, messages });
    } catch (err) {
      console.error("Error in getMessagesByConversation:", error);
      return sendJson(res, 500, { message: "Failed to fetch messages" });
    }
  }
}

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  sendMessage,
  getMessagesByConversation,
};
