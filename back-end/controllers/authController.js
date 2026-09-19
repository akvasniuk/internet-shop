const User = require("../models/User");
const OAuth = require("../models/OAuth");
const { sendJson } = require("../helpers/response");
const authValidator = require("../validators/auth.login.validator");
const userIdValidator = require("../validators/id.validator");
const bcrypt = require("bcrypt");
const { generateTokenPair, verifyToken } = require("../helpers/auth.helper");

async function login(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parsedData = JSON.parse(body || "{}");

      const { error } = await authValidator.validate(parsedData);

      if (error) {
        return sendJson(res, 400, { message: error.details[0].message });
      }

      const { email, password } = parsedData;
      const userExists = await User.findOne({ email });

      if (!userExists) {
        return sendJson(res, 400, { message: "User not found" });
      }

      const p = await bcrypt.hash(password,10)

      const isPasswordCompare = await bcrypt.compare(
        password,
        userExists.password,
      );

      if (!isPasswordCompare) {
        return sendJson(res, 400, { message: "Email or password is wrong" });
      }

      const { _id } = userExists;

      const tokenPair = await generateTokenPair();

      await OAuth.create({ user: _id, ...tokenPair });

      const userObject = userExists.toObject();
      delete userObject.password;

      return sendJson(res, 201, { ...tokenPair, user: userObject });
    } catch (error) {
      if (!res.writableEnded) {
        return sendJson(res, 500, {
          message: "Server error",
          details: error.message,
        });
      }
    }
  });
}

async function refresh(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendJson(res, 401, { message: "Missing Authorization Header" });
    }

    const token = authHeader.split(" ")[1];

    const isTokenValid = await verifyToken(token, "REFRESH");

    if (!isTokenValid) {
      return sendJson(res, 401, { message: "Token not valid" });
    }

    const tokenObject = await OAuth.findOne({ refreshToken: token });

    if (!tokenObject) {
      return sendJson(res, 401, { message: "Wrong token" });
    }

    const { user, refreshToken } = tokenObject;

    const tokenPair = generateTokenPair();

    await OAuth.remove({ refreshToken });
    await OAuth.create({ ...tokenPair, user: _id });

    const userObject = user.toObject();
    delete userObject.password;

    return sendJson(res, 201, { ...tokenPair, userObject });
  } catch (error) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

async function logout(req, res) {
  try {
    const parts = req.url.split("/");

    if (parts[1] === "auth" && parts[2] === "logout" && parts[3]) {
      const userId = parts[3];

      const { error } = await userIdValidator.validate(userId);

      if (error) {
        return sendJson(res, 400, { message: "User id is not valid" });
      }

      const userById = await User.findOne({ _id: userId });

      if (!userById) {
        return sendJson(res, 400, { message: "User not exists" });
      }

      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return sendJson(res, 401, { message: "Missing Authorization Header" });
      }

      const token = authHeader.split(" ")[1];

      const isTokenValid = await verifyToken(token);

      if (!isTokenValid) {
        return sendJson(res, 401, { message: "Token not valid" });
      }

      const tokenObject = await OAuth.findOne({ accessToken: token });

      if (!tokenObject) {
        return sendJson(res, 401, { message: "Wrong token" });
      }

      await OAuth.deleteOne({ accessToken: tokenObject.accessToken });
      return sendJson(res, 200, { message: "Successful logout" });
    }

    sendJson(res, 400, { message: "User id is not provided" });
  } catch (error) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

module.exports = { login, refresh, logout };
