const { login, logout, refresh } = require("../controllers/authController");

async function handleAuthRoutes(req, res) {
  const { method, url } = req;
  const baseURL = "http://" + req.headers.host;
  const { pathname } = new URL(req.url, baseURL);

  if (pathname === "/auth/login" && method === "POST") {
    await login(req, res);
    return true;
  }

  if (pathname === "/auth/refresh" && method === "POST") {
    await refresh(req, res);
    return true;
  }

  const logoutMatch = pathname.match(/^\/auth\/logout\/([^/]+)$/);
  if (logoutMatch && method === "POST") {
    await logout(req, res);
    return true;
  }

  return false;
}

module.exports = handleAuthRoutes;
