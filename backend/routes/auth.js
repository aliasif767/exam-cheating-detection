import express from "express";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyEmail,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} from "../middleware/validation.js";

const router = express.Router();

// Public routes
router.post("/register", registerValidation, handleValidationErrors, register);
router.post("/login", loginValidation, handleValidationErrors, login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(authenticate);
router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

export default router;
