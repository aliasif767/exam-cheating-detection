import express from "express";
import {
  verifyFace,
  registerFace,
  updateFaceData,
  getFaceVerificationHistory,
  reportViolation,
  getViolationHistory,
  startMonitoringSession,
  endMonitoringSession,
  updateSessionStatus,
} from "../controllers/verificationController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  faceVerificationValidation,
  violationReportValidation,
  paginationValidation,
  handleValidationErrors,
} from "../middleware/validation.js";
import multer from "multer";

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for face images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// All verification routes require authentication
router.use(authenticate);

// Face verification routes
router.post(
  "/face/verify",
  faceVerificationValidation,
  handleValidationErrors,
  verifyFace,
);

router.post(
  "/face/register",
  authorize("student"),
  upload.single("image"),
  registerFace,
);

router.put(
  "/face/update",
  authorize("student"),
  upload.single("image"),
  updateFaceData,
);

router.get(
  "/face/history",
  paginationValidation,
  handleValidationErrors,
  getFaceVerificationHistory,
);

// Violation reporting routes
router.post(
  "/violation/report",
  violationReportValidation,
  handleValidationErrors,
  reportViolation,
);

router.get(
  "/violation/history/:sessionId",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getViolationHistory,
);

// Monitoring session routes
router.post("/session/start", authorize("student"), startMonitoringSession);

router.post("/session/end", authorize("student"), endMonitoringSession);

router.put("/session/:sessionId/status", updateSessionStatus);

export default router;
