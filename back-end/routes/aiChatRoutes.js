const {
  getAiConversationsList,
  createNewAiConversation,
  getAiConversationById,
  sendAiMessage,
  deleteAiConversation,
} = require("../controllers/aiChatController");
const { verifyAuth } = require("../helpers/verifyAuth");

async function handleAiChatRoutes(req, res) {
  const { method, url } = req;

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/chat/ai/conversations" && method === "GET") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await getAiConversationsList(req, res);
    return true;
  }

  if (pathname === "/chat/ai/conversations" && method === "POST") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await createNewAiConversation(req, res);
    return true;
  }

  const conversationsByIdMatch = pathname.match(
    /^\/chat\/ai\/conversations\/([^/]+)$/,
  );
  if (conversationsByIdMatch && method === "GET") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) return true;

    await getAiConversationById(req, res);
    return true;
  }

  if (conversationsByIdMatch && method === "DELETE") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) return true;

    await deleteAiConversation(req, res);
    return true;
  }

  if (pathname === "/chat/ai/message" && method === "POST") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) return true;

    await sendAiMessage(req, res);
    return true;
  }

  return false;
}

module.exports = handleAiChatRoutes;
