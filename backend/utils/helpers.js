import crypto from "crypto";
import nodemailer from "nodemailer";

// Email utility functions
export const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (options) => {
  const transporter = createEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
};

// Template functions for emails
export const getWelcomeEmailTemplate = (user) => {
  return {
    subject: "Welcome to AI Vision Exam System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome ${user.firstName}!</h2>
        <p>Your account has been created successfully in the AI Vision Exam System.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Account Details:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${user.role}</p>
          ${user.studentId ? `<p><strong>Student ID:</strong> ${user.studentId}</p>` : ""}
        </div>
        <p>Please log in to your account and complete your profile setup.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
      </div>
    `,
  };
};

export const getExamNotificationTemplate = (exam, student) => {
  return {
    subject: `Exam Reminder: ${exam.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Exam Reminder</h2>
        <p>Dear ${student.firstName},</p>
        <p>This is a reminder about your upcoming exam:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>${exam.title}</h3>
          <p><strong>Subject:</strong> ${exam.subject}</p>
          <p><strong>Course:</strong> ${exam.course}</p>
          <p><strong>Exam Code:</strong> ${exam.examCode}</p>
          <p><strong>Date & Time:</strong> ${new Date(exam.startTime).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${exam.duration} minutes</p>
        </div>
        <p><strong>Important:</strong> Please ensure your face verification is completed before the exam starts.</p>
        <a href="${process.env.FRONTEND_URL}/student/exams" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Exam Details</a>
      </div>
    `,
  };
};

export const getViolationAlertTemplate = (violation, student, exam) => {
  return {
    subject: `URGENT: Exam Violation Alert - ${student.firstName} ${student.lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Exam Violation Alert</h2>
        <p>A ${violation.severity} violation has been detected during an exam:</p>
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Violation Details:</h3>
          <p><strong>Student:</strong> ${student.firstName} ${student.lastName} (${student.studentId})</p>
          <p><strong>Exam:</strong> ${exam.title}</p>
          <p><strong>Violation Type:</strong> ${violation.type}</p>
          <p><strong>Severity:</strong> ${violation.severity}</p>
          <p><strong>Time:</strong> ${new Date(violation.timestamp).toLocaleString()}</p>
          <p><strong>Description:</strong> ${violation.description}</p>
        </div>
        <p>Please review this violation immediately in the monitoring dashboard.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/monitoring" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      </div>
    `,
  };
};

// Utility functions for generating secure tokens
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

export const generateExamCode = (prefix = "EXAM") => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Date utility functions
export const isDateInFuture = (date) => {
  return new Date(date) > new Date();
};

export const isDateInPast = (date) => {
  return new Date(date) < new Date();
};

export const addMinutesToDate = (date, minutes) => {
  return new Date(date.getTime() + minutes * 60000);
};

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

// Validation utility functions
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidStudentId = (studentId) => {
  // Customize this regex based on your student ID format
  const studentIdRegex = /^[A-Z0-9]{6,10}$/;
  return studentIdRegex.test(studentId);
};

export const isStrongPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// File utility functions
export const isValidImageFile = (mimetype) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return allowedTypes.includes(mimetype);
};

export const convertBytesToMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2);
};

// Risk assessment utilities
export const calculateRiskScore = (violations) => {
  let score = 0;
  const weights = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  };

  violations.forEach((violation) => {
    score += weights[violation.severity] || 0;
  });

  return Math.min(100, score);
};

export const getRiskLevel = (score) => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export const getRecommendation = (riskScore, violationCount) => {
  if (riskScore >= 70 || violationCount >= 5) return "reject";
  if (riskScore >= 40 || violationCount >= 3) return "review";
  return "accept";
};

// Pagination utility
export const getPaginationData = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
  };
};

// Response formatting utility
export const formatSuccessResponse = (message, data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data) {
    response.data = data;
  }

  return response;
};

export const formatErrorResponse = (message, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return response;
};

// Time zone utility functions
export const convertToUTC = (date) => {
  return new Date(date).toISOString();
};

export const convertFromUTC = (utcDate, timezone = "UTC") => {
  return new Date(utcDate).toLocaleString("en-US", { timeZone: timezone });
};

// Logging utility
export const logActivity = (action, userId, details = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
    }),
  );
};
