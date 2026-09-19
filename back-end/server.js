const http = require("http");
require("dotenv").config();
const socket = require("socket.io");

const connectDB = require("./config/db");
const handleUserRoutes = require("./routes/userRoutes");
const handleProductRoutes = require("./routes/productRoutes");
const handleAuthRoutes = require("./routes/authRoutes");
const handleOrderRoutes = require("./routes/orderRoutes");
const handleChatRoutes = require("./routes/chatRoutes");
const handleChatAiRoutes = require("./routes/aiChatRoutes");
const seedProducts = require("./runner/mockProducts");
const seedAdmin = require("./runner/mockAdmin");
const { initSocket } = require("./socket/socket.service");
const { sendJson } = require("./helpers/response");

connectDB();
seedProducts();
seedAdmin();

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.url.startsWith("/users")) {
      const handled = await handleUserRoutes(req, res);
      if (handled) return;
    } else if (req.url.startsWith("/products")) {
      const handled = await handleProductRoutes(req, res);
      if (handled) return;
    } else if (req.url.startsWith("/auth")) {
      const handled = await handleAuthRoutes(req, res);
      if (handled) return;
    } else if (req.url.startsWith("/orders")) {
      const handled = await handleOrderRoutes(req, res);
      if (handled) return;
    } else if (req.url.startsWith("/chat/ai")) {
      const handled = await handleChatAiRoutes(req, res);
      if (handled) return;
    } else if (req.url.startsWith("/chat")) {
      const handled = await handleChatRoutes(req, res);
      if (handled) return;
    }

    sendJson(res, 404, { message: "Route not found" });
  } catch (err) {
    console.log(err);
    sendJson(res, 500, { message: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

initSocket(server);
