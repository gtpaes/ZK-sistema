const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const rateLimit = (req, res, next) => {
  const key = req.ip || req.headers["x-forwarded-for"] || "anonymous";
  const now = Date.now();
  let record = attempts.get(key);

  if (!record) {
    record = { count: 0, firstRequestAt: now, blockedUntil: null };
    attempts.set(key, record);
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    return res.status(429).json({
      success: false,
      message: "Muitas tentativas. Tente novamente mais tarde.",
    });
  }

  if (now - record.firstRequestAt > WINDOW_MS) {
    record.count = 0;
    record.firstRequestAt = now;
    record.blockedUntil = null;
  }

  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS;
    return res.status(429).json({
      success: false,
      message: "Muitas tentativas. Tente novamente mais tarde.",
    });
  }

  attempts.set(key, record);
  next();
};

module.exports = { rateLimit };
