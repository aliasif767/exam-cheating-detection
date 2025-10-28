import express from "express";
import {
  getDashboardStats,
  getLiveMonitoring,
  getAlerts,
  getReports,
  getExamAnalytics,
  getStudentVerificationStatus,
  getUpcomingExams,
  getSystemHealth,
} from "../controllers/dashboardController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  paginationValidation,
  handleValidationErrors,
} from "../middleware/validation.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Admin and invigilator routes
router.get("/stats", authorize("admin", "invigilator"), getDashboardStats);

router.get(
  "/live-monitoring",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getLiveMonitoring,
);

router.get(
  "/alerts",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getAlerts,
);

router.get(
  "/reports",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getReports,
);

router.get(
  "/exam-analytics/:examId",
  authorize("admin", "invigilator"),
  getExamAnalytics,
);

router.get(
  "/verification-status",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getStudentVerificationStatus,
);

router.get(
  "/upcoming-exams",
  authorize("admin", "invigilator"),
  getUpcomingExams,
);

// Admin only routes
router.get("/system-health", authorize("admin"), getSystemHealth);

export default router;
