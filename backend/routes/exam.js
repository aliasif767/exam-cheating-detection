import express from "express";
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
  startExam,
  endExam,
  getStudentExams,
  joinExam,
} from "../controllers/examController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createExamValidation,
  updateExamValidation,
  examQueryValidation,
  paginationValidation,
  handleValidationErrors,
} from "../middleware/validation.js";

const router = express.Router();

// All exam routes require authentication
router.use(authenticate);

// Public exam routes (for students)
router.get(
  "/student/my-exams",
  authorize("student"),
  paginationValidation,
  handleValidationErrors,
  getStudentExams,
);

router.post("/student/join/:examCode", authorize("student"), joinExam);

// Admin and invigilator routes
router.get(
  "/",
  authorize("admin", "invigilator"),
  examQueryValidation,
  paginationValidation,
  handleValidationErrors,
  getExams,
);

router.get("/:id", authorize("admin", "invigilator"), getExamById);

router.get(
  "/:id/students",
  authorize("admin", "invigilator"),
  paginationValidation,
  handleValidationErrors,
  getEnrolledStudents,
);

// Admin only routes
router.post(
  "/",
  authorize("admin"),
  createExamValidation,
  handleValidationErrors,
  createExam,
);

router.put(
  "/:id",
  authorize("admin"),
  updateExamValidation,
  handleValidationErrors,
  updateExam,
);

router.delete("/:id", authorize("admin"), deleteExam);

router.post("/:id/enroll/:studentId", authorize("admin"), enrollStudent);

router.delete("/:id/enroll/:studentId", authorize("admin"), unenrollStudent);

router.post("/:id/start", authorize("admin", "invigilator"), startExam);

router.post("/:id/end", authorize("admin", "invigilator"), endExam);

export default router;
