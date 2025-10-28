import User from "../models/User.js";
import MonitoringSession from "../models/MonitoringSession.js";
import Exam from "../models/Exam.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

// Mock face recognition functions (in production, integrate with actual face recognition API)
const mockFaceRecognition = {
  extractFaceDescriptor: (imageData) => {
    // Mock implementation - return a random descriptor
    return Array(128)
      .fill(0)
      .map(() => Math.random());
  },

  compareFaces: (descriptor1, descriptor2, threshold = 0.6) => {
    // Mock implementation - calculate similarity
    if (!descriptor1 || !descriptor2) return { confidence: 0, match: false };

    // Simple mock similarity calculation
    const similarity = Math.random() * 0.4 + 0.6; // Mock similarity between 0.6-1.0
    return {
      confidence: similarity,
      match: similarity >= threshold,
    };
  },

  detectFaces: (imageData) => {
    // Mock implementation - detect if faces are present
    return {
      faceCount: Math.floor(Math.random() * 3), // 0-2 faces
      hasFace: Math.random() > 0.2, // 80% chance of having a face
      multipleFaces: Math.random() > 0.8, // 20% chance of multiple faces
    };
  },
};

// @desc    Verify face during exam
// @route   POST /api/verification/face/verify
// @access  Private
export const verifyFace = asyncHandler(async (req, res) => {
  const { sessionId, image } = req.body;

  // Find monitoring session
  const session = await MonitoringSession.findOne({ sessionId }).populate(
    "student",
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Monitoring session not found",
    });
  }

  // Check if user owns this session
  if (!session.student._id.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access to session",
    });
  }

  try {
    // Detect faces in the image
    const faceDetection = mockFaceRecognition.detectFaces(image);

    let verificationResult = {
      timestamp: new Date(),
      result: "failed",
      confidence: 0,
      image: image.substring(0, 100) + "...", // Store truncated image for demo
    };

    if (!faceDetection.hasFace) {
      verificationResult.result = "no_face";
    } else if (faceDetection.multipleFaces) {
      verificationResult.result = "multiple_faces";
      // Add violation for multiple faces
      await session.addViolation({
        type: "multiple_faces",
        severity: "high",
        description: "Multiple faces detected in frame",
        evidence: image.substring(0, 100) + "...",
      });
    } else if (session.student.faceData) {
      // Compare with registered face
      const storedDescriptor = JSON.parse(session.student.faceData);
      const currentDescriptor =
        mockFaceRecognition.extractFaceDescriptor(image);
      const comparison = mockFaceRecognition.compareFaces(
        storedDescriptor,
        currentDescriptor,
      );

      verificationResult.confidence = comparison.confidence;
      verificationResult.result = comparison.match ? "verified" : "failed";

      if (!comparison.match) {
        // Add violation for failed verification
        await session.addViolation({
          type: "unauthorized_person",
          severity: "critical",
          description: "Face verification failed - potential impersonation",
          evidence: image.substring(0, 100) + "...",
        });
      }
    } else {
      verificationResult.result = "no_reference";
    }

    // Add verification to session
    await session.addFaceVerification(verificationResult);

    // Emit real-time update
    req.app.get("io").emit("faceVerification", {
      sessionId,
      result: verificationResult,
    });

    res.status(200).json({
      success: true,
      data: {
        result: verificationResult.result,
        confidence: verificationResult.confidence,
      },
    });
  } catch (error) {
    console.error("Face verification error:", error);
    res.status(500).json({
      success: false,
      message: "Face verification failed",
    });
  }
});

// @desc    Register face for student
// @route   POST /api/verification/face/register
// @access  Private (Student)
export const registerFace = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Face image is required",
    });
  }

  try {
    const imageData = req.file.buffer.toString("base64");

    // Detect faces in the image
    const faceDetection = mockFaceRecognition.detectFaces(imageData);

    if (!faceDetection.hasFace) {
      return res.status(400).json({
        success: false,
        message: "No face detected in the image",
      });
    }

    if (faceDetection.multipleFaces) {
      return res.status(400).json({
        success: false,
        message:
          "Multiple faces detected. Please ensure only one face is visible",
      });
    }

    // Extract face descriptor
    const faceDescriptor = mockFaceRecognition.extractFaceDescriptor(imageData);

    // Update user with face data
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        faceData: JSON.stringify(faceDescriptor),
        profileImage: `data:${req.file.mimetype};base64,${imageData}`,
        verificationStatus: "pending",
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Face registered successfully. Awaiting admin verification.",
      data: {
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Face registration error:", error);
    res.status(500).json({
      success: false,
      message: "Face registration failed",
    });
  }
});

// @desc    Update face data
// @route   PUT /api/verification/face/update
// @access  Private (Student)
export const updateFaceData = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Face image is required",
    });
  }

  try {
    const imageData = req.file.buffer.toString("base64");

    // Detect faces in the image
    const faceDetection = mockFaceRecognition.detectFaces(imageData);

    if (!faceDetection.hasFace) {
      return res.status(400).json({
        success: false,
        message: "No face detected in the image",
      });
    }

    if (faceDetection.multipleFaces) {
      return res.status(400).json({
        success: false,
        message:
          "Multiple faces detected. Please ensure only one face is visible",
      });
    }

    // Extract face descriptor
    const faceDescriptor = mockFaceRecognition.extractFaceDescriptor(imageData);

    // Update user with new face data
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        faceData: JSON.stringify(faceDescriptor),
        profileImage: `data:${req.file.mimetype};base64,${imageData}`,
        verificationStatus: "pending",
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Face data updated successfully. Awaiting admin verification.",
      data: {
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Face update error:", error);
    res.status(500).json({
      success: false,
      message: "Face update failed",
    });
  }
});

// @desc    Get face verification history
// @route   GET /api/verification/face/history
// @access  Private
export const getFaceVerificationHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { sessionId, startDate, endDate } = req.query;

  // Build filter based on user role
  const filter = {};
  if (req.user.role === "student") {
    filter.student = req.user._id;
  } else if (sessionId) {
    filter.sessionId = sessionId;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const sessions = await MonitoringSession.find(filter)
    .populate("student", "firstName lastName studentId")
    .populate("exam", "title examCode")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalSessions = await MonitoringSession.countDocuments(filter);

  // Extract face verifications
  const verificationHistory = sessions.flatMap((session) =>
    session.faceVerifications.map((verification) => ({
      sessionId: session.sessionId,
      student: session.student,
      exam: session.exam,
      ...verification.toObject(),
    })),
  );

  res.status(200).json({
    success: true,
    data: {
      verifications: verificationHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        totalItems: totalSessions,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Report violation
// @route   POST /api/verification/violation/report
// @access  Private
export const reportViolation = asyncHandler(async (req, res) => {
  const { sessionId, type, severity, description, evidence } = req.body;

  // Find monitoring session
  const session = await MonitoringSession.findOne({ sessionId });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Monitoring session not found",
    });
  }

  // Check if user owns this session or is an invigilator/admin
  if (
    !session.student.equals(req.user._id) &&
    !["admin", "invigilator"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access to session",
    });
  }

  const violation = {
    type,
    severity,
    description,
    evidence,
    timestamp: new Date(),
  };

  await session.addViolation(violation);

  // Emit real-time alert
  req.app.get("io").emit("violationReported", {
    sessionId,
    violation,
    studentId: session.student,
  });

  res.status(200).json({
    success: true,
    message: "Violation reported successfully",
    data: { violation },
  });
});

// @desc    Get violation history
// @route   GET /api/verification/violation/history/:sessionId
// @access  Private (Admin, Invigilator)
export const getViolationHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const session = await MonitoringSession.findOne({ sessionId })
    .populate("student", "firstName lastName studentId")
    .populate("exam", "title examCode");

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Monitoring session not found",
    });
  }

  const totalViolations = session.violations.length;
  const violations = session.violations
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    data: {
      session: {
        sessionId: session.sessionId,
        student: session.student,
        exam: session.exam,
        status: session.status,
      },
      violations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalViolations / limit),
        totalItems: totalViolations,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Start monitoring session
// @route   POST /api/verification/session/start
// @access  Private (Student)
export const startMonitoringSession = asyncHandler(async (req, res) => {
  const { examId } = req.body;

  // Check if exam exists and is ongoing
  const exam = await Exam.findById(examId);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  if (exam.status !== "ongoing") {
    return res.status(400).json({
      success: false,
      message: "Exam is not currently active",
    });
  }

  // Check if student is enrolled
  const isEnrolled = exam.enrolledStudents.some((enrollment) =>
    enrollment.student.equals(req.user._id),
  );

  if (!isEnrolled) {
    return res.status(403).json({
      success: false,
      message: "You are not enrolled in this exam",
    });
  }

  // Check for existing active session
  const existingSession = await MonitoringSession.findOne({
    exam: examId,
    student: req.user._id,
    status: { $in: ["active", "paused"] },
  });

  if (existingSession) {
    return res.status(200).json({
      success: true,
      message: "Monitoring session already active",
      data: { session: existingSession },
    });
  }

  // Create new monitoring session
  const session = await MonitoringSession.create({
    exam: examId,
    student: req.user._id,
    sessionId: uuidv4(),
    startTime: new Date(),
    status: "active",
  });

  // Emit real-time event
  req.app.get("io").emit("sessionStarted", {
    sessionId: session.sessionId,
    studentId: req.user._id,
    examId,
  });

  res.status(201).json({
    success: true,
    message: "Monitoring session started",
    data: { session },
  });
});

// @desc    End monitoring session
// @route   POST /api/verification/session/end
// @access  Private (Student)
export const endMonitoringSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  const session = await MonitoringSession.findOne({ sessionId });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Monitoring session not found",
    });
  }

  // Check if user owns this session
  if (!session.student.equals(req.user._id)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access to session",
    });
  }

  if (session.status === "completed" || session.status === "terminated") {
    return res.status(400).json({
      success: false,
      message: "Session is already ended",
    });
  }

  // Calculate final report
  const riskScore = session.calculateRiskScore();
  let recommendation = "accept";
  if (riskScore > 70) recommendation = "reject";
  else if (riskScore > 40) recommendation = "review";

  session.status = "completed";
  session.endTime = new Date();
  session.finalReport = {
    totalViolations: session.violations.length,
    riskScore,
    recommendation,
    notes: `Session completed with ${session.violations.length} violations`,
  };

  await session.save();

  // Emit real-time event
  req.app.get("io").emit("sessionEnded", {
    sessionId: session.sessionId,
    studentId: req.user._id,
    finalReport: session.finalReport,
  });

  res.status(200).json({
    success: true,
    message: "Monitoring session ended",
    data: { session },
  });
});

// @desc    Update session status
// @route   PUT /api/verification/session/:sessionId/status
// @access  Private
export const updateSessionStatus = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { status, reason } = req.body;

  const session = await MonitoringSession.findOne({ sessionId });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Monitoring session not found",
    });
  }

  // Check permissions
  if (
    !session.student.equals(req.user._id) &&
    !["admin", "invigilator"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access to session",
    });
  }

  const oldStatus = session.status;
  session.status = status;

  if (status === "terminated") {
    session.isTerminated = true;
    session.terminationReason = reason || "Session terminated";
    session.endTime = new Date();
  } else if (status === "completed") {
    session.endTime = new Date();
  }

  await session.save();

  // Emit real-time event
  req.app.get("io").emit("sessionStatusChanged", {
    sessionId,
    oldStatus,
    newStatus: status,
    reason,
  });

  res.status(200).json({
    success: true,
    message: "Session status updated",
    data: { session },
  });
});
