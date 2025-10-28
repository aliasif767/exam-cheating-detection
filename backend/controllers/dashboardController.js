import mongoose from "mongoose";
import User from "../models/User.js";
import Exam from "../models/Exam.js";
import MonitoringSession from "../models/MonitoringSession.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private (Admin, Invigilator)
export const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Parallel queries for better performance
  const [
    totalStudents,
    totalExams,
    activeExams,
    completedExamsToday,
    ongoingSessions,
    totalViolationsToday,
    verifiedStudents,
    pendingVerifications,
  ] = await Promise.all([
    User.countDocuments({ role: "student", isActive: true }),
    Exam.countDocuments(),
    Exam.countDocuments({ status: "ongoing" }),
    Exam.countDocuments({
      status: "completed",
      endTime: { $gte: today },
    }),
    MonitoringSession.countDocuments({ status: "active" }),
    MonitoringSession.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
        },
      },
      {
        $project: {
          violationCount: { $size: "$violations" },
        },
      },
      {
        $group: {
          _id: null,
          totalViolations: { $sum: "$violationCount" },
        },
      },
    ]),
    User.countDocuments({
      role: "student",
      verificationStatus: "verified",
    }),
    User.countDocuments({
      role: "student",
      verificationStatus: "pending",
    }),
  ]);

  // Weekly exam trends
  const weeklyExams = await Exam.aggregate([
    {
      $match: {
        createdAt: { $gte: thisWeek },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Monthly violation trends
  const monthlyViolations = await MonitoringSession.aggregate([
    {
      $match: {
        createdAt: { $gte: thisMonth },
      },
    },
    {
      $unwind: "$violations",
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$violations.timestamp",
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalStudents,
        totalExams,
        activeExams,
        completedExamsToday,
        ongoingSessions,
        totalViolationsToday: totalViolationsToday[0]?.totalViolations || 0,
        verifiedStudents,
        pendingVerifications,
      },
      trends: {
        weeklyExams,
        monthlyViolations,
      },
    },
  });
});

// @desc    Get live monitoring data
// @route   GET /api/dashboard/live-monitoring
// @access  Private (Admin, Invigilator)
export const getLiveMonitoring = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const activeSessions = await MonitoringSession.find({ status: "active" })
    .populate("exam", "title examCode")
    .populate("student", "firstName lastName studentId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalActiveSessions = await MonitoringSession.countDocuments({
    status: "active",
  });

  // Get recent violations for active sessions
  const recentViolations = await MonitoringSession.aggregate([
    {
      $match: { status: "active" },
    },
    {
      $unwind: "$violations",
    },
    {
      $sort: { "violations.timestamp": -1 },
    },
    {
      $limit: 20,
    },
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    {
      $lookup: {
        from: "exams",
        localField: "exam",
        foreignField: "_id",
        as: "exam",
      },
    },
    {
      $project: {
        violation: "$violations",
        student: { $arrayElemAt: ["$student", 0] },
        exam: { $arrayElemAt: ["$exam", 0] },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      activeSessions,
      recentViolations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActiveSessions / limit),
        totalItems: totalActiveSessions,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get alerts
// @route   GET /api/dashboard/alerts
// @access  Private (Admin, Invigilator)
export const getAlerts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // High-priority violations in last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const alerts = await MonitoringSession.aggregate([
    {
      $match: {
        createdAt: { $gte: yesterday },
      },
    },
    {
      $unwind: "$violations",
    },
    {
      $match: {
        "violations.severity": { $in: ["high", "critical"] },
        "violations.timestamp": { $gte: yesterday },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    {
      $lookup: {
        from: "exams",
        localField: "exam",
        foreignField: "_id",
        as: "exam",
      },
    },
    {
      $sort: { "violations.timestamp": -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $project: {
        violation: "$violations",
        student: { $arrayElemAt: ["$student", 0] },
        exam: { $arrayElemAt: ["$exam", 0] },
        sessionStatus: "$status",
      },
    },
  ]);

  const totalAlerts = await MonitoringSession.aggregate([
    {
      $match: {
        createdAt: { $gte: yesterday },
      },
    },
    {
      $unwind: "$violations",
    },
    {
      $match: {
        "violations.severity": { $in: ["high", "critical"] },
        "violations.timestamp": { $gte: yesterday },
      },
    },
    {
      $count: "total",
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      alerts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil((totalAlerts[0]?.total || 0) / limit),
        totalItems: totalAlerts[0]?.total || 0,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get reports
// @route   GET /api/dashboard/reports
// @access  Private (Admin, Invigilator)
export const getReports = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { startDate, endDate, examId, status } = req.query;

  // Build filter
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (examId) filter.exam = examId;
  if (status) filter.status = status;

  const reports = await MonitoringSession.find(filter)
    .populate("exam", "title examCode")
    .populate("student", "firstName lastName studentId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalReports = await MonitoringSession.countDocuments(filter);

  // Calculate summary statistics
  const summary = await MonitoringSession.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        terminatedSessions: {
          $sum: { $cond: [{ $eq: ["$status", "terminated"] }, 1, 0] },
        },
        totalViolations: { $sum: { $size: "$violations" } },
        avgRiskScore: { $avg: "$finalReport.riskScore" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports,
      summary: summary[0] || {
        totalSessions: 0,
        completedSessions: 0,
        terminatedSessions: 0,
        totalViolations: 0,
        avgRiskScore: 0,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReports / limit),
        totalItems: totalReports,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get exam analytics
// @route   GET /api/dashboard/exam-analytics/:examId
// @access  Private (Admin, Invigilator)
export const getExamAnalytics = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  // Get exam details
  const exam = await Exam.findById(examId).populate("enrolledStudents.student");

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  // Get monitoring sessions for this exam
  const sessions = await MonitoringSession.find({ exam: examId }).populate(
    "student",
    "firstName lastName studentId",
  );

  // Calculate analytics
  const totalEnrolled = exam.enrolledStudents.length;
  const totalAppeared = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const terminatedSessions = sessions.filter((s) => s.status === "terminated");

  const violationStats = sessions.reduce(
    (acc, session) => {
      session.violations.forEach((violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        acc.total += 1;
      });
      return acc;
    },
    { total: 0 },
  );

  const riskScoreDistribution = sessions
    .filter((s) => s.finalReport?.riskScore !== undefined)
    .map((s) => s.finalReport.riskScore);

  res.status(200).json({
    success: true,
    data: {
      exam,
      analytics: {
        participation: {
          totalEnrolled,
          totalAppeared,
          attendanceRate: totalEnrolled > 0 ? totalAppeared / totalEnrolled : 0,
        },
        sessions: {
          completed: completedSessions.length,
          terminated: terminatedSessions.length,
          active: sessions.filter((s) => s.status === "active").length,
        },
        violations: violationStats,
        riskScores: {
          distribution: riskScoreDistribution,
          average:
            riskScoreDistribution.length > 0
              ? riskScoreDistribution.reduce((a, b) => a + b) /
                riskScoreDistribution.length
              : 0,
        },
      },
      sessions,
    },
  });
});

// @desc    Get student verification status
// @route   GET /api/dashboard/verification-status
// @access  Private (Admin, Invigilator)
export const getStudentVerificationStatus = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { status, search } = req.query;

  // Build filter
  const filter = { role: "student" };
  if (status) filter.verificationStatus = status;
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

  // Get verification statistics
  const verificationStats = await User.aggregate([
    { $match: { role: "student" } },
    {
      $group: {
        _id: "$verificationStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      students,
      stats: verificationStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalStudents / limit),
        totalItems: totalStudents,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get upcoming exams
// @route   GET /api/dashboard/upcoming-exams
// @access  Private (Admin, Invigilator)
export const getUpcomingExams = asyncHandler(async (req, res) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingExams = await Exam.find({
    startTime: { $gte: now, $lte: nextWeek },
    status: "scheduled",
  })
    .populate("createdBy", "firstName lastName")
    .populate("invigilators", "firstName lastName")
    .sort({ startTime: 1 });

  res.status(200).json({
    success: true,
    data: { upcomingExams },
  });
});

// @desc    Get system health
// @route   GET /api/dashboard/system-health
// @access  Private (Admin)
export const getSystemHealth = asyncHandler(async (req, res) => {
  // Database health
  const dbStats = await mongoose.connection.db.stats();

  // Active sessions
  const activeSessions = await MonitoringSession.countDocuments({
    status: "active",
  });

  // Recent errors (you might want to implement error logging)
  const recentErrors = []; // Placeholder

  // System metrics
  const systemHealth = {
    database: {
      status: "healthy",
      collections: dbStats.collections,
      dataSize: dbStats.dataSize,
      indexSize: dbStats.indexSize,
    },
    application: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    },
    monitoring: {
      activeSessions,
      recentErrors: recentErrors.length,
    },
  };

  res.status(200).json({
    success: true,
    data: { systemHealth },
  });
});
