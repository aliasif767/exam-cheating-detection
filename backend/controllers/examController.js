import Exam from "../models/Exam.js";
import User from "../models/User.js";
import MonitoringSession from "../models/MonitoringSession.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

// @desc    Create new exam
// @route   POST /api/exam
// @access  Private (Admin)
export const createExam = asyncHandler(async (req, res) => {
  const examData = {
    ...req.body,
    createdBy: req.user._id,
    examCode: req.body.examCode || `EXAM${Date.now()}`.toUpperCase(),
  };

  // Validate dates
  if (new Date(examData.startTime) >= new Date(examData.endTime)) {
    return res.status(400).json({
      success: false,
      message: "End time must be after start time",
    });
  }

  if (examData.passingMarks > examData.maxMarks) {
    return res.status(400).json({
      success: false,
      message: "Passing marks cannot exceed maximum marks",
    });
  }

  const exam = await Exam.create(examData);
  await exam.populate("createdBy", "firstName lastName");

  res.status(201).json({
    success: true,
    message: "Exam created successfully",
    data: { exam },
  });
});

// @desc    Get all exams
// @route   GET /api/exam
// @access  Private (Admin, Invigilator)
export const getExams = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const {
    status,
    startDate,
    endDate,
    course,
    subject,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (course) filter.course = { $regex: course, $options: "i" };
  if (subject) filter.subject = { $regex: subject, $options: "i" };

  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { examCode: { $regex: search, $options: "i" } },
      { course: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === "desc" ? -1 : 1;

  const exams = await Exam.find(filter)
    .populate("createdBy", "firstName lastName")
    .populate("invigilators", "firstName lastName")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalExams = await Exam.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      exams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalExams / limit),
        totalItems: totalExams,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Get exam by ID
// @route   GET /api/exam/:id
// @access  Private (Admin, Invigilator)
export const getExamById = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id)
    .populate("createdBy", "firstName lastName email")
    .populate("invigilators", "firstName lastName email")
    .populate("enrolledStudents.student", "firstName lastName email studentId");

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  // Get monitoring statistics for this exam
  const monitoringStats = await MonitoringSession.aggregate([
    { $match: { exam: exam._id } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = monitoringStats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: { exam, monitoringStats: stats },
  });
});

// @desc    Update exam
// @route   PUT /api/exam/:id
// @access  Private (Admin)
export const updateExam = asyncHandler(async (req, res) => {
  let exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  // Prevent updates if exam is ongoing or completed
  if (exam.status === "ongoing" || exam.status === "completed") {
    return res.status(400).json({
      success: false,
      message: "Cannot update exam that is ongoing or completed",
    });
  }

  // Validate dates if they are being updated
  const startTime = req.body.startTime
    ? new Date(req.body.startTime)
    : exam.startTime;
  const endTime = req.body.endTime ? new Date(req.body.endTime) : exam.endTime;

  if (startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "End time must be after start time",
    });
  }

  // Validate marks if they are being updated
  const maxMarks = req.body.maxMarks || exam.maxMarks;
  const passingMarks = req.body.passingMarks || exam.passingMarks;

  if (passingMarks > maxMarks) {
    return res.status(400).json({
      success: false,
      message: "Passing marks cannot exceed maximum marks",
    });
  }

  exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("createdBy", "firstName lastName")
    .populate("invigilators", "firstName lastName");

  res.status(200).json({
    success: true,
    message: "Exam updated successfully",
    data: { exam },
  });
});

// @desc    Delete exam
// @route   DELETE /api/exam/:id
// @access  Private (Admin)
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  // Prevent deletion if exam has started
  if (exam.status !== "scheduled") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete exam that has started",
    });
  }

  await Exam.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Exam deleted successfully",
  });
});

// @desc    Enroll student in exam
// @route   POST /api/exam/:id/enroll/:studentId
// @access  Private (Admin)
export const enrollStudent = asyncHandler(async (req, res) => {
  const { id: examId, studentId } = req.params;

  const exam = await Exam.findById(examId);
  const student = await User.findById(studentId);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  if (!student || student.role !== "student") {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  // Check if student is already enrolled
  const isEnrolled = exam.enrolledStudents.some((enrollment) =>
    enrollment.student.equals(studentId),
  );

  if (isEnrolled) {
    return res.status(400).json({
      success: false,
      message: "Student is already enrolled in this exam",
    });
  }

  exam.enrolledStudents.push({
    student: studentId,
    enrollmentDate: new Date(),
  });

  await exam.save();

  res.status(200).json({
    success: true,
    message: "Student enrolled successfully",
  });
});

// @desc    Unenroll student from exam
// @route   DELETE /api/exam/:id/enroll/:studentId
// @access  Private (Admin)
export const unenrollStudent = asyncHandler(async (req, res) => {
  const { id: examId, studentId } = req.params;

  const exam = await Exam.findById(examId);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  // Remove student from enrolled list
  exam.enrolledStudents = exam.enrolledStudents.filter(
    (enrollment) => !enrollment.student.equals(studentId),
  );

  await exam.save();

  res.status(200).json({
    success: true,
    message: "Student unenrolled successfully",
  });
});

// @desc    Get enrolled students for an exam
// @route   GET /api/exam/:id/students
// @access  Private (Admin, Invigilator)
export const getEnrolledStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const exam = await Exam.findById(req.params.id).populate({
    path: "enrolledStudents.student",
    select: "firstName lastName email studentId verificationStatus",
  });

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  const totalStudents = exam.enrolledStudents.length;
  const students = exam.enrolledStudents.slice(skip, skip + limit);

  res.status(200).json({
    success: true,
    data: {
      examTitle: exam.title,
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

// @desc    Start exam
// @route   POST /api/exam/:id/start
// @access  Private (Admin, Invigilator)
export const startExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  if (exam.status !== "scheduled") {
    return res.status(400).json({
      success: false,
      message: "Exam cannot be started",
    });
  }

  exam.status = "ongoing";
  await exam.save();

  // Emit socket event for real-time updates
  req.app.get("io").emit("examStarted", { examId: exam._id, exam });

  res.status(200).json({
    success: true,
    message: "Exam started successfully",
    data: { exam },
  });
});

// @desc    End exam
// @route   POST /api/exam/:id/end
// @access  Private (Admin, Invigilator)
export const endExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found",
    });
  }

  if (exam.status !== "ongoing") {
    return res.status(400).json({
      success: false,
      message: "Exam is not currently ongoing",
    });
  }

  exam.status = "completed";
  await exam.save();

  // End all active monitoring sessions for this exam
  await MonitoringSession.updateMany(
    { exam: exam._id, status: "active" },
    { status: "completed", endTime: new Date() },
  );

  // Emit socket event for real-time updates
  req.app.get("io").emit("examEnded", { examId: exam._id, exam });

  res.status(200).json({
    success: true,
    message: "Exam ended successfully",
    data: { exam },
  });
});

// @desc    Get student's exams
// @route   GET /api/exam/student/my-exams
// @access  Private (Student)
export const getStudentExams = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { status } = req.query;

  // Build filter for exams where student is enrolled
  const filter = {
    "enrolledStudents.student": req.user._id,
  };

  if (status) {
    filter.status = status;
  }

  const exams = await Exam.find(filter)
    .select("-enrolledStudents")
    .populate("createdBy", "firstName lastName")
    .populate("invigilators", "firstName lastName")
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(limit);

  const totalExams = await Exam.countDocuments(filter);

  // Get monitoring sessions for these exams
  const examIds = exams.map((exam) => exam._id);
  const sessions = await MonitoringSession.find({
    exam: { $in: examIds },
    student: req.user._id,
  });

  // Map sessions to exams
  const examsWithSessions = exams.map((exam) => {
    const session = sessions.find((s) => s.exam.equals(exam._id));
    return {
      ...exam.toObject(),
      mySession: session,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      exams: examsWithSessions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalExams / limit),
        totalItems: totalExams,
        itemsPerPage: limit,
      },
    },
  });
});

// @desc    Join exam with exam code
// @route   POST /api/exam/student/join/:examCode
// @access  Private (Student)
export const joinExam = asyncHandler(async (req, res) => {
  const { examCode } = req.params;

  const exam = await Exam.findOne({ examCode: examCode.toUpperCase() });

  if (!exam) {
    return res.status(404).json({
      success: false,
      message: "Exam not found with this code",
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

  // Check if exam is ongoing
  if (exam.status !== "ongoing") {
    return res.status(400).json({
      success: false,
      message: "Exam is not currently active",
    });
  }

  // Check if student verification is required and completed
  if (
    exam.examSettings.faceVerificationRequired &&
    req.user.verificationStatus !== "verified"
  ) {
    return res.status(400).json({
      success: false,
      message: "Face verification required to join exam",
    });
  }

  // Check if student already has an active session
  const existingSession = await MonitoringSession.findOne({
    exam: exam._id,
    student: req.user._id,
    status: { $in: ["active", "paused"] },
  });

  if (existingSession) {
    return res.status(200).json({
      success: true,
      message: "Rejoined existing exam session",
      data: { exam, session: existingSession },
    });
  }

  // Create new monitoring session
  const session = await MonitoringSession.create({
    exam: exam._id,
    student: req.user._id,
    sessionId: uuidv4(),
    startTime: new Date(),
  });

  // Emit socket event for real-time monitoring
  req.app.get("io").emit("studentJoined", {
    examId: exam._id,
    studentId: req.user._id,
    sessionId: session.sessionId,
  });

  res.status(200).json({
    success: true,
    message: "Successfully joined exam",
    data: { exam, session },
  });
});
