/**
 * server.js — Servidor Express do ZK SurfHouse
 *
 * Arquitetura:
 *   Frontend (GitHub Pages)
 *      ↓ HTTPS
 *   API Express (este servidor)
 *      ↓ MongoDB Driver
 *   MongoDB Atlas
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const routes = require("./routes/index");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";
// Em dev o frontend é servido estático na MESMA porta da API (:PORT).
// POSTs mesmo-origem ainda enviam header Origin, então essas origens
// precisam estar liberadas no CORS para o login não ser bloqueado.
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
const path = require('path');

/* ---------- Middleware globais ---------- */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS origin denied: ${origin}`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "25mb" })); // suporta fotos base64 comprimidas
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Em desenvolvimento, sirva os arquivos estáticos do frontend a partir da pasta /docs
if (process.env.NODE_ENV !== 'production') {
  const docsPath = path.join(__dirname, '..', 'docs');
  app.use(express.static(docsPath));
  console.log(`📁 Servindo frontend estático (dev) em ${docsPath}`);
}

/* ---------- Rotas ---------- */
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API do ZK SurfHouse operacional", time: new Date().toISOString() });
});

app.use("/api", routes);

/* ---------- Tratamento de erros ---------- */
app.use(notFound);
app.use(errorHandler);

/* ---------- Inicialização ---------- */
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 API do ZK SurfHouse rodando em http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
};

start();