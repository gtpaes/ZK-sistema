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
const connectDB = require("./config/db");
const routes = require("./routes/index");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- Middleware globais ---------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: false,
  })
);
app.use(express.json({ limit: "25mb" })); // suporta fotos base64 comprimidas
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

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