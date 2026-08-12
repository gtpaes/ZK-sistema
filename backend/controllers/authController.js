const authService = require("../services/authService");

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "zk_auth";
const COOKIE_MAX_AGE = Number(process.env.AUTH_COOKIE_MAX_AGE || 7 * 24 * 60 * 60 * 1000);
// Em produção o frontend (GitHub Pages) e a API (Render) são origens
// diferentes (cross-site) -> precisa SameSite=None + Secure.
// Em desenvolvimento (localhost -> localhost) é same-site -> SameSite=Lax
// (cookie None sem Secure é rejeitado pelo navegador e trava o login).
const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: COOKIE_MAX_AGE,
  path: "/",
};

function clearCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email ou senha inválidos." });
    }

    const { user, token } = await authService.authenticate({ email, password });
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ success: false, message: "Email ou senha inválidos." });
    }
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    clearCookie(res);
    res.json({ success: true, message: "Logout realizado." });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Não autenticado." });
    }
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { nome, email, password, registrationToken, token } = req.body;
    const registrationKey = registrationToken || token;
    if (!nome || !email || !password || !registrationKey) {
      return res.status(400).json({ success: false, message: "Dados inválidos. Envie nome, email, password e registrationToken." });
    }

    const { user, token: authToken } = await authService.registerInitialOwner({
      nome,
      email,
      password,
      registrationToken: registrationKey,
    });

    res.cookie(AUTH_COOKIE_NAME, authToken, cookieOptions);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.status === 403) {
      return res.status(403).json({ success: false, message: err.message || "Registro não disponível." });
    }
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Acesso negado." });
    }

    const { nome, email, password } = req.body;
    if (!nome || !email || !password) {
      return res.status(400).json({ success: false, message: "Dados inválidos." });
    }

    const { user } = await authService.createUser({ nome, email, password });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.status === 400 || err.status === 409) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
}

module.exports = {
  login,
  logout,
  me,
  register,
  createUser,
};
