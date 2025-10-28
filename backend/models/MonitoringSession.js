import mongoose from "mongoose";

const monitoringSessionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "terminated", "suspicious"],
      default: "active",
    },
    faceVerifications: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
        },
        result: {
          type: String,
          enum: ["verified", "failed", "no_face", "multiple_faces"],
        },
        image: {
          type: String, // Base64 encoded image
        },
      },
    ],
    violations: [
      {
        type: {
          type: String,
          enum: [
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
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
        description: {
          type: String,
        },
        evidence: {
          type: String, // Screenshot or other evidence
        },
        action: {
          type: String,
          enum: ["warning", "pause", "terminate", "flag"],
          default: "warning",
        },
      },
    ],
    browserInfo: {
      userAgent: String,
      platform: String,
      language: String,
      screenResolution: String,
      timezone: String,
    },
    systemInfo: {
      ip: String,
      location: {
        country: String,
        region: String,
        city: String,
      },
    },
    activityLog: [
      {
        action: {
          type: String,
          enum: [
            "login",
            "start_exam",
            "answer_question",
            "submit_answer",
            "pause_exam",
            "resume_exam",
            "submit_exam",
            "logout",
            "violation",
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    warningCount: {
      type: Number,
      default: 0,
    },
    isTerminated: {
      type: Boolean,
      default: false,
    },
    terminationReason: {
      type: String,
    },
    finalReport: {
      totalViolations: Number,
      riskScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      recommendation: {
        type: String,
        enum: ["accept", "review", "reject"],
      },
      notes: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
monitoringSessionSchema.index({ exam: 1, student: 1 });
monitoringSessionSchema.index({ sessionId: 1 });
monitoringSessionSchema.index({ status: 1 });
monitoringSessionSchema.index({ startTime: 1 });

// Virtual for session duration
monitoringSessionSchema.virtual("duration").get(function () {
  const end = this.endTime || new Date();
  return Math.floor((end - this.startTime) / 1000 / 60); // Duration in minutes
});

// Method to add violation
monitoringSessionSchema.methods.addViolation = function (violation) {
  this.violations.push(violation);
  this.warningCount += 1;

  // Auto-terminate if too many violations
  if (this.warningCount >= 5 || violation.severity === "critical") {
    this.status = "terminated";
    this.isTerminated = true;
    this.terminationReason = "Too many violations detected";
    this.endTime = new Date();
  }

  return this.save();
};

// Method to add face verification
monitoringSessionSchema.methods.addFaceVerification = function (verification) {
  this.faceVerifications.push(verification);
  return this.save();
};

// Method to calculate risk score
monitoringSessionSchema.methods.calculateRiskScore = function () {
  let score = 0;

  this.violations.forEach((violation) => {
    switch (violation.severity) {
      case "low":
        score += 5;
        break;
      case "medium":
        score += 15;
        break;
      case "high":
        score += 30;
        break;
      case "critical":
        score += 50;
        break;
    }
  });

  // Consider face verification failures
  const failedVerifications = this.faceVerifications.filter(
    (v) => v.result === "failed" || v.result === "no_face",
  );
  score += failedVerifications.length * 10;

  return Math.min(100, score);
};

const MonitoringSession = mongoose.model(
  "MonitoringSession",
  monitoringSessionSchema,
);

export default MonitoringSession;
