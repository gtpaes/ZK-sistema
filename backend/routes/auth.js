const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { rateLimit } = require("../middleware/rateLimit");
const { auth: authMiddleware } = require("../middleware/auth");

router.post("/login", rateLimit, authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);
router.post("/register", authController.register);
router.post("/users", authMiddleware, authController.createUser);

module.exports = router;
