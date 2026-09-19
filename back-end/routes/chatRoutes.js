const {
  getOrCreateConversation,
  getUserConversations,
  sendMessage,
  getMessagesByConversation,
} = require("../controllers/chatController");
const { verifyAuth, verifyIsAdmin } = require("../helpers/verifyAuth");

async function handleChatRoutes(req, res) {
  const { method, url } = req;

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/chat/conversation" && method === "POST") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await getOrCreateConversation(req, res);
    return true;
  }

  if (pathname === "/chat/conversations" && method === "GET") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await getUserConversations(req, res);
    return true;
  }

  if (pathname === "/chat/messages" && method === "POST") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) return true;

    await sendMessage(req, res);
    return true;
  }

  const messagesMatch = pathname.match(/^\/chat\/messages\/([^/]+)$/);
  if (messagesMatch && method === "GET") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await getMessagesByConversation(req, res);
    return true;
  }

  return false;
}

module.exports = handleChatRoutes;
