const { sendJson } = require("../helpers/response");
const { verifyToken } = require("./auth.helper");
const OAuth = require("../models/OAuth");

async function verifyAuth(req, res) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    sendJson(res, 401, { message: "No token provided" });
    return false;
  }

  try {
    const isTokenValid = await verifyToken(token);

    if (!isTokenValid) {
      sendJson(res, 401, { message: "Token not valid" });
      return false;
    }

    const tokenObject = await OAuth.findOne({ accessToken: token });

    if (!tokenObject) {
      sendJson(res, 401, { message: "Wrong token" });
      return false;
    }

    req.user = tokenObject.user;
    return true;
  } catch (err) {
    sendJson(res, 401, { message: "Token not valid or expired" });
    return false;
  }
}

async function verifyIsAdmin(req, res) {
  try {
    const { user } = req;

    if (!user) {
      sendJson(res, 401, { message: "User not found" });
      return false;
    }

    if (user.role !== "ADMIN") {
      sendJson(res, 403, { message: "User is not admin" });
      return false;
    }

    return true;
  } catch (err) {
    sendJson(res, 401, { message: "Server error: " + err.message });
    return false;
  }
}

module.exports = {
  verifyAuth,
  verifyIsAdmin
};
