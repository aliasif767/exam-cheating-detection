import User from "../models/User.js";
import { generateToken, generateRefreshToken } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// In authController.js (The 'register' function)

// In authController.js (The 'register' function)

export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, studentId } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  // Check if student ID exists for students
  if (role === "student" && studentId) {
    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student ID already exists",
      });
    }
  }

  // Create user instance (The correct way to trigger pre-save hooks)
  const user = new User({
    email,
    password,
    firstName,
    lastName,
    role,
    // Conditionally include studentId only if role is student AND studentId is provided
    ...(role === "student" && studentId && { studentId }),
  });

  // Save explicitly (triggers password hashing)
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user,
      token,
    },
  });
});
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account is deactivated",
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Remove password from response
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user,
      token,
      refreshToken,
    },
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  // In a production app, you might want to blacklist the token
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "firstName",
    "lastName",
    "phoneNumber",
    "department",
    "dateOfBirth",
  ];
  const updates = {};

  // Only allow certain fields to be updated
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  // Send email (implement based on your email service)
  try {
    // Configure your email service here
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // This is a placeholder - implement actual email sending
    console.log(`Password reset URL: ${resetUrl}`);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(500).json({
      success: false,
      message: "Email could not be sent",
    });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Hash token to compare with stored token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token required",
    });
  }

  try {
    const jwt = (await import("jsonwebtoken")).default;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // This is a placeholder - implement email verification logic
  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification token",
    });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});
