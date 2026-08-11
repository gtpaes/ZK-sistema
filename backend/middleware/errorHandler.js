/**
 * middleware/errorHandler.js — Tratamento global de erros
 *
 * Respostas padronizadas:
 *   { success: false, message: "..." }
 */

/* 404 — rota não encontrada */
const notFound = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/* Handler global de erros */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Erro interno do servidor";

  // Erros de validação do Mongoose
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors,
    });
  }

  // Erro de ID inválido do Mongoose (CastError)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `ID inválido: ${err.value}`,
    });
  }

  // Erro de chave duplicada
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Registro duplicado: este valor já existe no banco.",
    });
  }

  console.error(`❌ Erro [${status}]:`, err.message);

  res.status(status).json({
    success: false,
    message,
  });
};

module.exports = { notFound, errorHandler };