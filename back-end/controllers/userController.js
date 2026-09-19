const User = require("../models/User");
const { sendJson } = require("../helpers/response");
const userValidator = require("../validators/user.validator");
const userUpdateValidator = require("../validators/user.update.validator");
const idValidator = require("../validators/id.validator");
const bcrypt = require("bcrypt");

async function getUsers(req, res) {
  try {
    //const users = await findUsersFromDb();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: [] }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Помилка бази даних" }));
  }
}

async function createUser(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parsedBody = JSON.parse(body || "{}");
      const { error } = await userValidator.validate(parsedBody);

      if (error) {
        return sendJson(res, 400, { message: error.details[0].message });
      }

      const { firstname, lastname, email, password } = parsedBody;
      const userExists = await User.findOne({ email });

      if (userExists) {
        return sendJson(res, 409, { message: "User already exists" });
      }

      const newUser = await User.create({
        firstname,
        lastname,
        email,
        password,
      });

      return sendJson(res, 201, {
        message: "User registered successfully",
        user: newUser,
      });
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

async function updateUser(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parts = req.url.split("/");

      if (parts[1] === "users" && parts[2]) {
        const userId = parts[2];

        const { error } = await idValidator.validate(userId);

        if (error) {
          return sendJson(res, 400, { message: "User id is not valid" });
        }

        const parsedBody = JSON.parse(body || "{}");
        const { error: userUpdateError } =
          await userUpdateValidator.validate(parsedBody);

        if (userUpdateError) {
          return sendJson(res, 400, {
            message: userUpdateError.details[0].message,
          });
        }

        const userById = await User.findOne({ _id: userId });

        if (!userById) {
          return sendJson(res, 400, { message: "User not exists" });
        }

        const { firstname, lastname } = parsedBody;
        const { user } = req;

        if (!userById._id.equals(user._id)) {
          return sendJson(res, 401, { message: "Wrong token or user id" });
        }

        await User.findByIdAndUpdate(userById._id, { firstname, lastname });

        return sendJson(res, 200, { message: "User successfully updated" });
      }

      return sendJson(res, 400, { message: "User id is not provided" });
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

async function updateUserPassword(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parts = req.url.split("/");

      if (parts[1] === "users" && parts[2]) {
        const userId = parts[2];

        const { error } = await idValidator.validate(userId);

        if (error) {
          return sendJson(res, 400, { message: "User id is not valid" });
        }

        const parsedBody = JSON.parse(body || "{}");
        const { error: userUpdatePasswordError } =
          await userUpdateValidator.validate(parsedBody);

        if (userUpdatePasswordError) {
          return sendJson(res, 400, {
            message: userUpdatePasswordError.details[0].message,
          });
        }

        const userById = await User.findOne({ _id: userId });

        if (!userById) {
          return sendJson(res, 400, { message: "User not exists" });
        }

        const { password, newPassword } = parsedBody;

        if (!password || !newPassword) {
          return sendJson(res, 400, {
            message: "Missing password or new password",
          });
        }

        if (password === newPassword) {
          return sendJson(res, 400, {
            message: "Passwords the same",
          });
        }

        const { user } = req;

        if (!userById._id.equals(user._id)) {
          return sendJson(res, 401, { message: "Wrong token or user id" });
        }

        const isPasswordCompare = await bcrypt.compare(
          password,
          userById.password,
        );

        if (!isPasswordCompare) {
          return sendJson(res, 400, { message: "Wrong password" });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(userById._id, {
          password: newPasswordHash,
        });

        return sendJson(res, 200, {
          message: "User password successfully updated",
        });
      }

      return sendJson(res, 400, { message: "User id is not provided" });
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

module.exports = { getUsers, createUser, updateUser, updateUserPassword };
