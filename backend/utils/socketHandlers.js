import jwt from "jsonwebtoken";
import User from "../models/User.js";
import MonitoringSession from "../models/MonitoringSession.js";

export const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.isActive) {
        return next(new Error("Authentication error"));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.user.email} connected via socket`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific rooms
    if (socket.userRole === "admin" || socket.userRole === "invigilator") {
      socket.join("monitoring");
    }

    // Handle exam session joining
    socket.on("joinExamSession", async (data) => {
      const { sessionId, examId } = data;

      try {
        // Verify session ownership
        const session = await MonitoringSession.findOne({
          sessionId,
          student: socket.userId,
        });

        if (!session) {
          socket.emit("error", { message: "Invalid session" });
          return;
        }

        // Join exam-specific room
        socket.join(`exam:${examId}`);
        socket.join(`session:${sessionId}`);

        socket.sessionId = sessionId;
        socket.examId = examId;

        // Notify monitoring room about student joining
        socket.to("monitoring").emit("studentJoinedExam", {
          sessionId,
          examId,
          student: socket.user,
          timestamp: new Date(),
        });

        socket.emit("joinedExamSession", { sessionId, examId });
      } catch (error) {
        console.error("Error joining exam session:", error);
        socket.emit("error", { message: "Failed to join exam session" });
      }
    });

    // Handle live face verification during exam
    socket.on("liveFaceVerification", async (data) => {
      const { sessionId, imageData } = data;

      try {
        // Basic validation
        if (!sessionId || !imageData) {
          socket.emit("error", { message: "Invalid verification data" });
          return;
        }

        // Find session
        const session = await MonitoringSession.findOne({
          sessionId,
          student: socket.userId,
        });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Mock face verification (replace with actual implementation)
        const verificationResult = {
          timestamp: new Date(),
          result: Math.random() > 0.2 ? "verified" : "failed",
          confidence: Math.random() * 0.4 + 0.6,
        };

        // Update session with verification
        session.faceVerifications.push(verificationResult);
        await session.save();

        // Send result to student
        socket.emit("faceVerificationResult", verificationResult);

        // Send to monitoring room for real-time tracking
        socket.to("monitoring").emit("liveFaceVerification", {
          sessionId,
          studentId: socket.userId,
          student: socket.user,
          result: verificationResult,
        });
      } catch (error) {
        console.error("Error in live face verification:", error);
        socket.emit("error", { message: "Face verification failed" });
      }
    });

    // Handle violation reporting
    socket.on("reportViolation", async (data) => {
      const { sessionId, type, severity, description } = data;

      try {
        const session = await MonitoringSession.findOne({ sessionId });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        const violation = {
          type,
          severity,
          description,
          timestamp: new Date(),
        };

        await session.addViolation(violation);

        // Send to monitoring room for immediate alert
        socket.to("monitoring").emit("violationAlert", {
          sessionId,
          studentId: session.student,
          student: socket.user,
          violation,
          urgent: severity === "critical" || severity === "high",
        });

        socket.emit("violationReported", { violation });
      } catch (error) {
        console.error("Error reporting violation:", error);
        socket.emit("error", { message: "Failed to report violation" });
      }
    });

    // Handle session status updates
    socket.on("updateSessionStatus", async (data) => {
      const { sessionId, status, reason } = data;

      try {
        const session = await MonitoringSession.findOne({ sessionId });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Check permissions
        if (
          !session.student.equals(socket.userId) &&
          !["admin", "invigilator"].includes(socket.userRole)
        ) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        const oldStatus = session.status;
        session.status = status;

        if (status === "terminated") {
          session.isTerminated = true;
          session.terminationReason = reason;
          session.endTime = new Date();
        } else if (status === "completed") {
          session.endTime = new Date();
        }

        await session.save();

        // Notify all relevant parties
        socket.to(`session:${sessionId}`).emit("sessionStatusChanged", {
          sessionId,
          oldStatus,
          newStatus: status,
          reason,
        });

        socket.to("monitoring").emit("sessionStatusChanged", {
          sessionId,
          studentId: session.student,
          oldStatus,
          newStatus: status,
          reason,
        });

        socket.emit("sessionStatusUpdated", { sessionId, status });
      } catch (error) {
        console.error("Error updating session status:", error);
        socket.emit("error", { message: "Failed to update session status" });
      }
    });

    // Handle monitoring dashboard connections
    socket.on("joinMonitoring", () => {
      if (socket.userRole === "admin" || socket.userRole === "invigilator") {
        socket.join("monitoring");
        socket.emit("joinedMonitoring");
      } else {
        socket.emit("error", { message: "Unauthorized" });
      }
    });

    // Handle real-time monitoring requests
    socket.on("requestLiveData", async () => {
      if (socket.userRole === "admin" || socket.userRole === "invigilator") {
        try {
          const activeSessions = await MonitoringSession.find({
            status: "active",
          })
            .populate("student", "firstName lastName studentId")
            .populate("exam", "title examCode")
            .limit(20);

          socket.emit("liveData", { activeSessions });
        } catch (error) {
          socket.emit("error", { message: "Failed to fetch live data" });
        }
      }
    });

    // Handle tab switching detection
    socket.on("tabSwitch", async (data) => {
      const { sessionId } = data;

      try {
        const session = await MonitoringSession.findOne({
          sessionId,
          student: socket.userId,
        });

        if (session) {
          await session.addViolation({
            type: "tab_switch",
            severity: "medium",
            description: "Student switched browser tab during exam",
            timestamp: new Date(),
          });

          // Alert monitoring room
          socket.to("monitoring").emit("violationAlert", {
            sessionId,
            studentId: socket.userId,
            student: socket.user,
            violation: {
              type: "tab_switch",
              severity: "medium",
              description: "Tab switch detected",
            },
          });
        }
      } catch (error) {
        console.error("Error handling tab switch:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.email} disconnected`);

      // If student disconnects during exam, mark as potential violation
      if (socket.sessionId && socket.userRole === "student") {
        MonitoringSession.findOne({ sessionId: socket.sessionId })
          .then((session) => {
            if (session && session.status === "active") {
              session.addViolation({
                type: "disconnection",
                severity: "medium",
                description: "Student disconnected during exam",
                timestamp: new Date(),
              });

              // Notify monitoring room
              socket.to("monitoring").emit("studentDisconnected", {
                sessionId: socket.sessionId,
                studentId: socket.userId,
                student: socket.user,
                timestamp: new Date(),
              });
            }
          })
          .catch((error) => {
            console.error("Error handling disconnection:", error);
          });
      }
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  // Periodic cleanup of inactive sessions (every 5 minutes)
  setInterval(
    async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const staleSessions = await MonitoringSession.find({
          status: "active",
          updatedAt: { $lt: fiveMinutesAgo },
        });

        for (const session of staleSessions) {
          await session.addViolation({
            type: "inactivity",
            severity: "medium",
            description: "Session became inactive",
            timestamp: new Date(),
          });

          io.to("monitoring").emit("sessionInactive", {
            sessionId: session.sessionId,
            studentId: session.student,
          });
        }
      } catch (error) {
        console.error("Error in session cleanup:", error);
      }
    },
    5 * 60 * 1000,
  );
};
