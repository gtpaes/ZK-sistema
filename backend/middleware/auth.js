/**
 * middleware/auth.js — Autenticação preparada para o futuro
 *
 * ⚠️ IMPORTANTE: Este middleware está DESATIVADO nesta etapa.
 * O login dos donos será implementado em uma etapa futura.
 *
 * Quando ativado, protegerá as rotas com:
 *   Authorization: Bearer <token>
 *
 * Estrutura preparada:
 *   Donos → login → JWT → API protegida → painel
 */

/**
 * Middleware de autenticação (desativado por padrão).
 * Para ativar no futuro, adicione `auth` nas rotas desejadas.
 */
const auth = (req, res, next) => {
  // TODO: Implementar verificação de JWT quando o login for criado
  // const token = req.headers.authorization?.replace("Bearer ", "");
  // if (!token) return res.status(401).json({ success: false, message: "Não autenticado" });
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   req.user = decoded;
  //   next();
  // } catch {
  //   return res.status(401).json({ success: false, message: "Token inválido ou expirado" });
  // }

  // Por enquanto, permite acesso sem autenticação
  next();
};

module.exports = { auth };