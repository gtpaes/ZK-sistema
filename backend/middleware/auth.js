const authService = require("../services/authService");

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "zk_auth";

/**
 * Em ambiente de desenvolvimento/local (NODE_ENV !== "production") o login é
 * dispensado: o painel abre direto (útil para rodar em localhost). Em produção
 * a autenticação JWT continua obrigatória. Para forçar a exigência mesmo em dev,
 * defina AUTH_REQUIRE=1; para forçar o bypass onde não for produção, deixe como está.
 */
const bypassAuthInDevelopment =
  process.env.AUTH_REQUIRE !== "1" &&
  process.env.NODE_ENV !== "production";

/** Só considera "acesso local" quando o Host da requisição é localhost/loopback. */
const isLocalHost = (req) => {
  const host = String(req.headers?.host || "");
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("[::1]")
  );
};

const auth = async (req, res, next) => {
  try {
    // Apenas fora de produção E com acesso vindo de localhost liberamos o acesso
    // sem login (usuário virtual de dev). Dupla proteção: não depende só do NODE_ENV.
    if (bypassAuthInDevelopment && isLocalHost(req)) {
      req.user = {
        id: "dev-local-user",
        nome: process.env.AUTH_DEV_NAME || "Usuário local (sem login)",
        email: "local",
        role: "admin",
      };
      return next();
    }

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
