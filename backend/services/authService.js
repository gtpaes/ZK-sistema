const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const AUTH_INITIAL_OWNER_TOKEN = process.env.AUTH_INITIAL_OWNER_TOKEN;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não encontrada. Defina no .env antes de iniciar o servidor.");
}

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const safeUser = (user) => ({
  id: user._id.toString(),
  nome: user.nome,
  email: user.email,
  role: user.role,
  ativo: user.ativo,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt,
});

const createToken = (user) =>
  jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

async function findByEmail(email) {
  return User.findOne({ email: normalizeEmail(email) });
}

async function getUserById(id) {
  return User.findById(id);
}

async function authenticate({ email, password }) {
  const user = await findByEmail(email);
  const genericError = new Error("Email ou senha inválidos.");
  genericError.status = 401;

  if (!user || !user.passwordHash) {
    throw genericError;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid || !user.ativo) {
    throw genericError;
  }

  user.lastLoginAt = new Date().toISOString();
  await user.save();

  return {
    user: safeUser(user),
    token: createToken(user),
  };
}

async function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);
    if (!user || !user.ativo) {
      const err = new Error("Não autenticado.");
      err.status = 401;
      throw err;
    }
    return safeUser(user);
  } catch (error) {
    const err = new Error("Não autenticado.");
    err.status = 401;
    throw err;
  }
}

async function registerInitialOwner({ nome, email, password, registrationToken }) {
  // Require a valid registration token to create any new user via the public
  // registration endpoint. The special-case "first user only" flow was removed
  // to allow registering when a valid token is provided.
  if (!AUTH_INITIAL_OWNER_TOKEN || registrationToken !== AUTH_INITIAL_OWNER_TOKEN) {
    const err = new Error("Token de registro inválido.");
    err.status = 403;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    nome,
    email: normalizeEmail(email),
    passwordHash,
    role: "admin",
  });

  return {
    user: safeUser(user),
    token: createToken(user),
  };
}

async function createUser({ nome, email, password }) {
  const existing = await findByEmail(email);
  if (existing) {
    const err = new Error("Email já cadastrado.");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    nome,
    email: normalizeEmail(email),
    passwordHash,
    role: "admin",
  });

  return {
    user: safeUser(user),
  };
}

module.exports = {
  authenticate,
  verifySessionToken,
  registerInitialOwner,
  createUser,
};
