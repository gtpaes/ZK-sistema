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
const isProd = process.env.NODE_ENV === "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

// Normaliza uma URL para apenas a ORIGEM (protocolo + host + porta), ignorando
// caminho e barra final. O navegador envia o header `Origin` somente como
// "https://gtpaes.github.io" — NUNCA com o caminho "/ZK-sistema/" — então é
// essencial reduzir FRONTEND_URL à origem antes de comparar no CORS.
const normalizeOrigin = (u) => {
  if (!u) return u;
  try {
    return new URL(u).origin; // ex.: "https://gtpaes.github.io/ZK-sistema/" -> "https://gtpaes.github.io"
  } catch {
    return String(u).replace(/\/+$/, "");
  }
};

// Em produção casa exatamente a origem do frontend (GitHub Pages).
// Em dev o frontend é servido estático na MESMA porta da API (:PORT), mas os
// POSTs mesmo-origem ainda enviam header Origin, então essas origens de
// desenvolvimento precisam estar liberadas para o login não ser bloqueado.
const ALLOWED_ORIGINS = [
  normalizeOrigin(FRONTEND_URL),
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
const path = require('path');

/* ---------- Middleware globais ---------- */
// Hardening de produção: HSTS faz o navegador sempre usar HTTPS no domínio da
// API, o que ajuda o Safari/iOS a tratar corretamente o cookie Secure. Só é
// enviado em produção (a API do Render já é HTTPS); em dev (localhost HTTP)
// fica desativado para não quebrar o ambiente local.
app.use((req, res, next) => {
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000");
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(normalizeOrigin(origin))) {
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