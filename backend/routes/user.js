import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfileImage,
  getStudents,
  getInvigilators,
  updateUserStatus,
  updateVerificationStatus,
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  updateUserValidation,
  paginationValidation,
  handleValidationErrors,
} from "../middleware/validation.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// All user routes require authentication
router.use(authenticate);

// Admin and invigilator routes
router.get(
  "/",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getAllUsers,
);

router.get(
  "/students",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getStudents,
);

router.get(
  "/invigilators",
  authorize("admin"),
  paginationValidation,
  handleValidationErrors,
  getInvigilators,
);

router.get("/:id", authorize("admin", "invigilator"), getUserById);

// Admin only routes
router.put(
  "/:id",
  authorize("admin"),
  updateUserValidation,
  handleValidationErrors,
  updateUser,
);

router.delete("/:id", authorize("admin"), deleteUser);

router.put("/:id/status", authorize("admin"), updateUserStatus);

router.put("/:id/verification", authorize("admin"), updateVerificationStatus);

// File upload route
router.post(
  "/:id/profile-image",
  authorize("admin"),
  upload.single("image"),
  uploadProfileImage,
);

export default router;
