const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;

const verifyPromise = promisify(jwt.verify);

function generateTokenPair() {
  const accessToken = jwt.sign({}, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({}, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function verifyToken(token, tokenType = "ACCESS") {
  try {
    const secretWord =
      tokenType === "ACCESS" ? ACCESS_TOKEN_SECRET : REFRESH_TOKEN_SECRET;

    await verifyPromise(token, secretWord);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateTokenPair,
  verifyToken,
};
