const {
  getUsers,
  createUser,
  updateUser,
  updateUserPassword,
} = require("../controllers/userController");
const { verifyAuth } = require("../helpers/verifyAuth");

async function handleUserRoutes(req, res) {
  const { method, url } = req;
  const baseURL = "http://" + req.headers.host;
  const { pathname } = new URL(req.url, baseURL);

  if (pathname === "/users" && method === "GET") {
    await getUsers(req, res);
    return true;
  }

  if (pathname === "/users" && method === "POST") {
    await createUser(req, res);
    return true;
  }

  const updateUserMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (updateUserMatch && method === "PATCH") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) {
      return true;
    }

    await updateUser(req, res);
    return true;
  }

  const updatePasswordMatch = pathname.match(/^\/users\/([^/]+)\/password$/);
  if (updatePasswordMatch && method === "PATCH") {
    const isAuth = await verifyAuth(req, res);
    if (!isAuth) {
      return true;
    }

    await updateUserPassword(req, res);
    return true;
  }

  return false;
}

module.exports = handleUserRoutes;
