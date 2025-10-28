import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import axios from 'axios';

// --- 1. Admin/Dashboard Function: Create Initial Absent Records ---
// @desc    Admin creates initial attendance records for a session (all Absent by default)
// @route   POST /api/attendance/session
// @access  Private (Admin)
export const createInitialAttendance = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate } = req.body;

  if (!sessionId || !attendanceDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Session ID and Date are required to initialize attendance." 
    });
  }

  // Find all active students
  const students = await User.find({ role: 'student', isActive: true }, '_id firstName lastName profileImage avatar');
  
  if (students.length === 0) {
    return res.status(404).json({ success: false, message: "No active students found." });
  }

  const attendanceRecords = students.map(student => ({
    student: student._id,
    sessionId: sessionId,
    attendanceDate: new Date(attendanceDate),
    studentName: `${student.firstName} ${student.lastName}`,
    studentPic: student.profileImage || student.avatar,
    attendanceMark: 'Absent',
  }));

  try {
    const result = await Attendance.insertMany(attendanceRecords, { ordered: false });

    res.status(201).json({ 
      success: true,
      message: `${result.length} attendance records initialized successfully. All students marked 'Absent'.`,
      data: {
        initializedCount: result.length,
        sessionId,
        attendanceDate,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: "Attendance records for this session and date already exist." 
      });
    }
    throw error;
  }
});

// --- 2. Invigilator/AI Function: Update Attendance from AI Scan ---
// @desc    Update attendance for students detected by AI
// @route   PUT /api/attendance/mark
// @access  Private (Invigilator)
export const updateAttendanceByAI = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate, presentStudentIds } = req.body;

  if (!sessionId || !attendanceDate || !Array.isArray(presentStudentIds) || presentStudentIds.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Session ID, Date, and a list of present student IDs are required." 
    });
  }

  const updateResult = await Attendance.updateMany(
    {
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
      student: { $in: presentStudentIds },
      attendanceMark: "Absent"
    },
    {
      $set: {
        attendanceMark: "Present",
        markedAt: new Date(),
      }
    }
  );

  if (updateResult.modifiedCount === 0) {
    return res.status(200).json({ 
      success: true,
      message: "No new students marked Present. They may have already been marked.",
      data: { modifiedCount: 0 }
    });
  }

  res.status(200).json({
    success: true,
    message: `${updateResult.modifiedCount} student(s) successfully marked as Present.`,
    data: {
      modifiedCount: updateResult.modifiedCount,
      sessionId,
    }
  });
});

// --- 3. New: Verify Attendance with AI Detection (Simple Names) ---
// @desc    Compare AI-detected student names with DB records and update
// @route   POST /api/attendance/verify-with-ai
// @access  Private (Invigilator/Admin)
export const verifyAttendanceWithAI = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate, aiDetectedStudents } = req.body;

  if (!sessionId || !attendanceDate) {
    return res.status(400).json({
      success: false,
      message: "Session ID and Date are required.",
    });
  }

  if (!Array.isArray(aiDetectedStudents) || aiDetectedStudents.length === 0) {
    return res.status(400).json({
      success: false,
      message: "aiDetectedStudents must be a non-empty array.",
    });
  }

  try {
    // Fetch attendance records with student info
    const attendanceRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    }).populate('student', '_id email firstName lastName profileImage');

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this session and date.",
      });
    }

    // Create mapping of names to student IDs
    const presentStudentIds = [];
    const matchLog = [];

    for (const aiName of aiDetectedStudents) {
      let matched = false;

      for (const record of attendanceRecords) {
        const fullName = `${record.student.firstName} ${record.student.lastName}`;
        const normalized = (str) => str.toLowerCase().trim();

        if (normalized(fullName) === normalized(aiName) ||
            normalized(fullName).includes(normalized(aiName)) ||
            normalized(aiName).includes(normalized(fullName))) {
          presentStudentIds.push(record.student._id);
          matchLog.push({
            detected: aiName,
            matched: fullName,
            status: "Matched"
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        matchLog.push({
          detected: aiName,
          matched: null,
          status: "Not Found"
        });
      }
    }

    // Update records
    const updateResult = await Attendance.updateMany(
      {
        sessionId: sessionId,
        attendanceDate: new Date(attendanceDate),
        student: { $in: presentStudentIds },
        attendanceMark: "Absent"
      },
      {
        $set: {
          attendanceMark: "Present",
          markedAt: new Date(),
        }
      }
    );

    // Get final summary
    const finalRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    });

    const presentCount = finalRecords.filter(r => r.attendanceMark === "Present").length;
    const absentCount = finalRecords.filter(r => r.attendanceMark === "Absent").length;

    res.status(200).json({
      success: true,
      message: `Verification complete. ${updateResult.modifiedCount} student(s) marked as Present.`,
      data: {
        sessionId,
        attendanceDate,
        detected: aiDetectedStudents.length,
        matched: presentStudentIds.length,
        updated: updateResult.modifiedCount,
        matchLog,
        summary: {
          present: presentCount,
          absent: absentCount,
          total: finalRecords.length,
        }
      }
    });
  } catch (error) {
    console.error("Error in verifyAttendanceWithAI:", error);
    throw error;
  }
});

// --- 4. New: Verify with Photo-based AI Report URL ---
// @desc    Fetch AI report from URL and update attendance
// @route   POST /api/attendance/verify-with-photos
// @access  Private (Invigilator/Admin)
export const verifyAttendanceWithPhotos = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate, aiReportUrl } = req.body;

  if (!sessionId || !attendanceDate || !aiReportUrl) {
    return res.status(400).json({
      success: false,
      message: "Session ID, Date, and AI report URL are required.",
    });
  }

  try {
    // Fetch AI report
    let aiReport;
    try {
      const response = await axios.get(aiReportUrl, { timeout: 10000 });
      aiReport = response.data;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Failed to fetch AI report: ${error.message}`,
      });
    }

    const aiPresentStudents = aiReport.present_students || [];

    if (aiPresentStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students detected as present in AI report.",
        data: { updated: 0, detected: 0 }
      });
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    }).populate('student', '_id firstName lastName email');

    const presentStudentIds = [];
    const matchDetails = [];

    // Match AI names with database
    for (const aiName of aiPresentStudents) {
      const match = attendanceRecords.find((record) => {
        const fullName = `${record.student.firstName} ${record.student.lastName}`;
        const normalize = (str) => str.toLowerCase().trim();
        
        return normalize(fullName) === normalize(aiName) ||
               normalize(fullName).includes(normalize(aiName)) ||
               normalize(aiName).includes(normalize(fullName));
      });

      if (match) {
        presentStudentIds.push(match.student._id);
        matchDetails.push({
          detected: aiName,
          matched: `${match.student.firstName} ${match.student.lastName}`,
          status: "Verified"
        });
      } else {
        matchDetails.push({
          detected: aiName,
          matched: "No match",
          status: "Not Found"
        });
      }
    }

    // Update attendance
    const updateResult = await Attendance.updateMany(
      {
        sessionId: sessionId,
        attendanceDate: new Date(attendanceDate),
        student: { $in: presentStudentIds },
        attendanceMark: "Absent"
      },
      {
        $set: {
          attendanceMark: "Present",
          markedAt: new Date(),
        }
      }
    );

    // Get final summary
    const finalRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    });

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} student(s) verified and marked Present.`,
      data: {
        sessionId,
        attendanceDate,
        aiDetected: aiPresentStudents.length,
        matched: matchDetails.filter(m => m.status === "Verified").length,
        updated: updateResult.modifiedCount,
        matchDetails,
        summary: {
          present: finalRecords.filter(r => r.attendanceMark === "Present").length,
          absent: finalRecords.filter(r => r.attendanceMark === "Absent").length,
          total: finalRecords.length,
        }
      }
    });
  } catch (error) {
    console.error("Error in verifyAttendanceWithPhotos:", error);
    throw error;
  }
});

// --- 5. New: Hybrid Verification (Recommended) ---
// @desc    Use AI report with confidence scores for robust verification
// @route   POST /api/attendance/hybrid-verify
// @access  Private (Invigilator/Admin)
export const hybridAttendanceVerification = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate, aiReport } = req.body;

  if (!sessionId || !attendanceDate || !aiReport) {
    return res.status(400).json({
      success: false,
      message: "Session ID, Date, and AI report data are required.",
    });
  }

  try {
    const aiPresentStudents = aiReport.present_students || [];
    const attendanceDetails = aiReport.attendance_details || {};

    if (aiPresentStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students detected in AI report.",
        data: { 
          updated: 0,
          detected: 0,
          verified: 0
        }
      });
    }

    // Fetch all attendance records
    const attendanceRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    }).populate('student', '_id email firstName lastName profileImage');

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this session and date.",
      });
    }

    const presentStudentIds = [];
    const verificationLog = [];

    // Match AI-detected students
    for (const aiName of aiPresentStudents) {
      const confidence = attendanceDetails[aiName]?.confidence || 0;
      let matched = false;

      for (const record of attendanceRecords) {
        const fullName = `${record.student.firstName} ${record.student.lastName}`;
        const normalize = (str) => str.toLowerCase().trim();

        if (normalize(fullName) === normalize(aiName) ||
            (normalize(fullName).includes(normalize(aiName)) && aiName.length > 2) ||
            (normalize(aiName).includes(normalize(fullName)) && fullName.length > 2)) {
          presentStudentIds.push(record.student._id);
          verificationLog.push({
            aiName,
            dbName: fullName,
            confidence: typeof confidence === 'string' ? parseFloat(confidence) : confidence,
            status: "Verified"
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        verificationLog.push({
          aiName,
          dbName: null,
          confidence: typeof confidence === 'string' ? parseFloat(confidence) : confidence,
          status: "No match"
        });
      }
    }

    // Perform bulk update
    const updateResult = await Attendance.updateMany(
      {
        sessionId: sessionId,
        attendanceDate: new Date(attendanceDate),
        student: { $in: presentStudentIds },
        attendanceMark: "Absent"
      },
      {
        $set: {
          attendanceMark: "Present",
          markedAt: new Date(),
        }
      }
    );

    // Get final summary
    const finalRecords = await Attendance.find({
      sessionId: sessionId,
      attendanceDate: new Date(attendanceDate),
    }).populate('student', 'firstName lastName');

    const presentList = finalRecords
      .filter(r => r.attendanceMark === "Present")
      .map(r => `${r.student.firstName} ${r.student.lastName}`);

    const absentList = finalRecords
      .filter(r => r.attendanceMark === "Absent")
      .map(r => `${r.student.firstName} ${r.student.lastName}`);

    res.status(200).json({
      success: true,
      message: `Hybrid verification complete. ${updateResult.modifiedCount} student(s) marked Present.`,
      data: {
        sessionId,
        attendanceDate,
        aiDetected: aiPresentStudents.length,
        verified: presentStudentIds.length,
        updated: updateResult.modifiedCount,
        verificationLog,
        summary: {
          present: finalRecords.filter(r => r.attendanceMark === "Present").length,
          absent: finalRecords.filter(r => r.attendanceMark === "Absent").length,
          total: finalRecords.length,
          presentStudents: presentList,
          absentStudents: absentList,
        }
      }
    });
  } catch (error) {
    console.error("Error in hybridAttendanceVerification:", error);
    throw error;
  }
});

// --- 6. Get Session Attendance ---
// @desc    Get complete attendance log for a session and date
// @route   GET /api/attendance/session
// @access  Private (Admin, Invigilator)
export const getSessionAttendance = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate } = req.query;

  if (!sessionId || !attendanceDate) {
    return res.status(400).json({ 
      success: false, 
      message: "Session ID and Date are required for lookup." 
    });
  }

  const attendanceLog = await Attendance.find({
    sessionId: sessionId,
    attendanceDate: new Date(attendanceDate),
  })
  .populate('student', 'email studentId firstName lastName profileImage');

  if (attendanceLog.length === 0) {
    return res.status(404).json({ 
      success: false, 
      message: "No attendance log found for this session and date." 
    });
  }

  const presentCount = attendanceLog.filter(r => r.attendanceMark === "Present").length;
  const absentCount = attendanceLog.filter(r => r.attendanceMark === "Absent").length;

  res.status(200).json({
    success: true,
    data: {
      attendance: attendanceLog,
      totalRecords: attendanceLog.length,
      presentCount,
      absentCount,
    }
  });
});

// --- 7. Get Attendance Summary ---
// @desc    Get summary statistics for attendance
// @route   GET /api/attendance/summary
// @access  Private
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { sessionId, attendanceDate } = req.query;

  if (!sessionId || !attendanceDate) {
    return res.status(400).json({
      success: false,
      message: "Session ID and Date are required.",
    });
  }

  const records = await Attendance.find({
    sessionId: sessionId,
    attendanceDate: new Date(attendanceDate),
  }).populate('student', 'firstName lastName');

  const presentStudents = records
    .filter(r => r.attendanceMark === "Present")
    .map(r => ({ name: `${r.student.firstName} ${r.student.lastName}`, marked: r.markedAt }));

  const absentStudents = records
    .filter(r => r.attendanceMark === "Absent")
    .map(r => `${r.student.firstName} ${r.student.lastName}`);

  res.status(200).json({
    success: true,
    data: {
      total: records.length,
      present: presentStudents.length,
      absent: absentStudents.length,
      presentStudents,
      absentStudents,
    }
  });
});