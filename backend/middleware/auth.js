const authService = require("../services/authService");

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "zk_auth";

const auth = async (req, res, next) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ success: false, message: "Não autenticado." });
    }

    const user = await authService.verifySessionToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Não autenticado." });
  }
};

module.exports = { auth };
