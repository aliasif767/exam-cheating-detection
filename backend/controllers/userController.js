import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// @desc    Get all users
// @route   GET /api/user
// @access  Private (Admin, Invigilator)
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const {
    role,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build filter
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.isActive = status === "active";

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { studentId: { $regex: search, $options: "i" } },
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  const users = await User.find(filter)
    .select("-password")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalUsers = await User.countDocuments(filter);

  // Get user statistics
  const stats = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        active: { $sum: { $cond: ["$isActive", 1, 0] } },
        verified: {
          $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          total: stat.count,
          active: stat.active,
          verified: stat.verified,
        };
        return acc;
      }, {}),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalItems: totalUsers,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get user by ID
// @route   GET /api/user/:id
// @access  Private (Admin, Invigilator)
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// @desc    Update user
// @route   PUT /api/user/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent updating super admin
  if (user.role === "admin" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Cannot update admin user",
    });
  }

  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "role",
    "department",
    "phoneNumber",
    "dateOfBirth",
    "isActive",
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: { user: updatedUser },
  });
});

// @desc    Delete user
// @route   DELETE /api/user/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Prevent deleting super admin
  if (user.role === "admin" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Cannot delete admin user",
    });
  }

  // Soft delete - just deactivate the user
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

// @desc    Get students
// @route   GET /api/user/students
// @access  Private (Admin, Invigilator)
export const getStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { verificationStatus, search, department } = req.query;

  // Build filter
  const filter = { role: "student" };
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (department) filter.department = { $regex: department, $options: "i" };

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { studentId: { $regex: search, $options: "i" } },
    ];
  }

  const students = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalStudents = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      students,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalStudents / limit),
        totalItems: totalStudents,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get invigilators
// @route   GET /api/user/invigilators
// @access  Private (Admin)
export const getInvigilators = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, isActive } = req.query;

  // Build filter
  const filter = { role: "invigilator" };
  if (isActive !== undefined) filter.isActive = isActive === "true";

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const invigilators = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalInvigilators = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      invigilators,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalInvigilators / limit),
        totalItems: totalInvigilators,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Update user status
// @route   PUT /api/user/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  user.isActive = isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    data: { user: user.toJSON() },
  });
});

// @desc    Update verification status
// @route   PUT /api/user/:id/verification
// @access  Private (Admin)
export const updateVerificationStatus = asyncHandler(async (req, res) => {
  const { verificationStatus } = req.body;

  if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification status",
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.role !== "student") {
    return res.status(400).json({
      success: false,
      message: "Only students can have verification status updated",
    });
  }

  user.verificationStatus = verificationStatus;
  if (verificationStatus === "verified") {
    user.isVerified = true;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Verification status updated successfully",
    data: { user: user.toJSON() },
  });
});

// @desc    Upload profile image
// @route   POST /api/user/:id/profile-image
// @access  Private (Admin)
export const uploadProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image file provided",
    });
  }

  // Convert image to base64 (in production, you'd upload to cloud storage)
  const imageBase64 = req.file.buffer.toString("base64");
  const imageUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

  user.profileImage = imageUrl;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile image uploaded successfully",
    data: { profileImage: user.profileImage },
  });
});
