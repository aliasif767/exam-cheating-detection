import { body, param, query, validationResult } from "express-validator";

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Auth validation rules
export const registerValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("role")
    .isIn(["admin", "invigilator", "student"])
    .withMessage("Valid role required"),
  body("studentId")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Student ID must be at least 3 characters"),
];

export const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Exam validation rules
export const createExamValidation = [
  body("title").trim().notEmpty().withMessage("Exam title is required"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("course").trim().notEmpty().withMessage("Course is required"),
  body("startTime").isISO8601().withMessage("Valid start time required"),
  body("endTime").isISO8601().withMessage("Valid end time required"),
  body("duration")
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
  body("maxMarks")
    .isInt({ min: 1 })
    .withMessage("Max marks must be a positive integer"),
  body("passingMarks")
    .isInt({ min: 0 })
    .withMessage("Passing marks must be a non-negative integer"),
];

export const updateExamValidation = [
  param("id").isMongoId().withMessage("Valid exam ID required"),
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("subject")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Subject cannot be empty"),
  body("course")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Course cannot be empty"),
  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Valid start time required"),
  body("endTime").optional().isISO8601().withMessage("Valid end time required"),
  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
  body("maxMarks")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max marks must be a positive integer"),
  body("passingMarks")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Passing marks must be a non-negative integer"),
];

// User validation rules
export const updateUserValidation = [
  param("id").isMongoId().withMessage("Valid user ID required"),
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty"),
  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("role")
    .optional()
    .isIn(["admin", "invigilator", "student"])
    .withMessage("Valid role required"),
  body("phoneNumber")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Valid phone number required"),
];

// Monitoring validation rules
export const faceVerificationValidation = [
  body("sessionId").notEmpty().withMessage("Session ID is required"),
  body("image").notEmpty().withMessage("Face image is required"),
];

export const violationReportValidation = [
  body("sessionId").notEmpty().withMessage("Session ID is required"),
  body("type")
    .isIn([
      "tab_switch",
      "multiple_faces",
      "no_face",
      "unauthorized_person",
      "object_detection",
      "audio_detection",
      "screen_share",
      "copy_paste",
      "right_click",
      "keyboard_shortcut",
    ])
    .withMessage("Valid violation type required"),
  body("severity")
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Valid severity level required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];

// Query validation
export const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const examQueryValidation = [
  query("status")
    .optional()
    .isIn(["scheduled", "ongoing", "completed", "cancelled"])
    .withMessage("Valid status required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Valid start date required"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("Valid end date required"),
];
