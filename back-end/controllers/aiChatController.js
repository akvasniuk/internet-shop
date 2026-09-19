const AiConversation = require("../models/AiConversation");
const { sendJson } = require("../helpers/response");
const idValidator = require("../validators/id.validator");

let aiClientInstance = null;

async function getAiClient() {
  if (!aiClientInstance) {
    const { GoogleGenAI } = await import("@google/genai");
    aiClientInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return aiClientInstance;
}

async function getAiConversationsList(req, res) {
  try {
    const userId = req.user._id;
    const conversations = await AiConversation.find({ user: userId })
      .select("_id title updatedAt createdAt")
      .sort({ updatedAt: -1 });

    return sendJson(res, 200, {
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("getAiConversationsList Error:", error);
    return sendJson(res, 500, { message: "Failed to fetch conversations" });
  }
}

async function createNewAiConversation(req, res) {
  try {
    const userId = req.user._id;
    const title = req.body?.title || "New Chat";

    const newChat = await AiConversation.create({
      user: userId,
      title,
      messages: [],
    });

    return sendJson(res, 201, {
      success: true,
      newChat,
    });
  } catch (error) {
    console.error("createNewAiConversation Error:", error);
    return sendJson(res, 500, { message: "Failed to create conversation" });
  }
}

async function getAiConversationById(req, res) {
  const parts = req.url.split("/");

  if (parts[4]) {
    try {
      const userId = req.user._id;
      const conversationId = parts[4];

      const { error } = await idValidator.validate(conversationId);

      if (error) {
        return sendJson(res, 400, { message: "Conversation id is not valid" });
      }

      const conversation = await AiConversation.findOne({
        _id: conversationId,
        user: userId,
      });

      if (!conversation) {
        return sendJson(res, 404, {
          messages: "Conversation not found",
        });
      }

      return sendJson(res, 200, {
        success: true,
        conversation,
      });
    } catch (error) {
      console.error("getAiConversationById Error:", error);
      return sendJson(res, 500, { message: "Failed to fetch chat details" });
    }
  }
}

async function sendAiMessage(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const userId = req.user._id;
      const { conversationId, prompt } = JSON.parse(body || "{}");

      if (!prompt || !prompt.trim()) {
        return sendJson(res, 400, {
          message: "Prompt text is required",
        });
      }

      let conversation;

      if (conversationId) {
        const { error } = await idValidator.validate(conversationId);

        if (error) {
          return sendJson(res, 400, {
            message: "Conversation id is not valid",
          });
        }

        conversation = await AiConversation.findOne({
          _id: conversationId,
          user: userId,
        });
      }

      if (!conversation) {
        conversation = await AiConversation.create({
          user: userId,
          title: prompt.trim().slice(0, 30) + (prompt.length > 30 ? "..." : ""),
          messages: [],
        });
      }

      if (
        conversation.messages.length === 0 &&
        conversation.title === "New Chat"
      ) {
        conversation.title =
          prompt.trim().slice(0, 30) + (prompt.length > 30 ? "..." : "");
      }

      const historyContext = conversation.messages.slice(-6).map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      historyContext.push({
        role: "user",
        parts: [{ text: prompt.trim() }],
      });

      const systemInstruction = `
      You are ElectroBot, a professional AI customer assistant for the ElectroShop online electronics store.
      - Advise users on smartphones, laptops, audio gear, and gadgets.
      - General terms: 1-3 days delivery across Ukraine, 14-day return window, 12-month standard warranty.
      - For personal order cancellations, complex disputes, or account changes, recommend contacting a live human manager.
      - Keep responses polite, helpful, and concise.
    `;

      const ai = await getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: historyContext,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 5000,
        },
      });

      const replyText = response.text;

      conversation.messages.push(
        { role: "user", text: prompt.trim() },
        { role: "model", text: replyText },
      );
      await conversation.save();

      return sendJson(res, 200, {
        conversationId: conversation._id,
        conversationTitle: conversation.title,
        reply: replyText,
        sender: { firstname: "ElectroBot (AI)" },
      });
    } catch (error) {
      console.error("sendAiMessage Error:", error);
      return sendJson(res, 500, {
        message: "AI assistant is temporarily unavailable",
      });
    }
  });
}

async function deleteAiConversation(req, res) {
  const parts = req.url.split("/");

  if (parts[4]) {
    try {
      const userId = req.user._id;
      const conversationId = parts[4];

      const { error } = await idValidator.validate(conversationId);

      if (error) {
        return sendJson(res, 400, { message: "Conversation id is not valid" });
      }

      await AiConversation.findOneAndDelete({
        _id: conversationId,
        user: userId,
      });

      return sendJson(res, 200, {
        message: "Chat deleted",
      });
    } catch (error) {
      console.error("deleteAiConversation Error:", error);
      return sendJson(res, 500, {
        message: "Failed to delete chat",
      });
    }
  }
}

module.exports = {
  getAiConversationsList,
  createNewAiConversation,
  getAiConversationById,
  sendAiMessage,
  deleteAiConversation,
};
