import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    examCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    maxMarks: {
      type: Number,
      required: true,
    },
    passingMarks: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invigilators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    enrolledStudents: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        enrollmentDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["enrolled", "appeared", "absent", "disqualified"],
          default: "enrolled",
        },
      },
    ],
    examSettings: {
      allowMultipleAttempts: {
        type: Boolean,
        default: false,
      },
      maxAttempts: {
        type: Number,
        default: 1,
      },
      shuffleQuestions: {
        type: Boolean,
        default: true,
      },
      showResultImmediately: {
        type: Boolean,
        default: false,
      },
      allowReview: {
        type: Boolean,
        default: true,
      },
      strictMode: {
        type: Boolean,
        default: true,
      },
      faceVerificationRequired: {
        type: Boolean,
        default: true,
      },
      continuousMonitoring: {
        type: Boolean,
        default: true,
      },
      tabSwitchLimit: {
        type: Number,
        default: 3,
      },
    },
    instructions: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
examSchema.index({ examCode: 1 });
examSchema.index({ startTime: 1 });
examSchema.index({ status: 1 });
examSchema.index({ createdBy: 1 });

// Virtual for checking if exam is active
examSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return (
    this.startTime <= now && this.endTime >= now && this.status === "ongoing"
  );
});

// Virtual for time remaining
examSchema.virtual("timeRemaining").get(function () {
  const now = new Date();
  if (this.endTime <= now) return 0;
  return Math.max(0, this.endTime - now);
});

// Pre-save middleware to generate exam code if not provided
examSchema.pre("save", function (next) {
  if (!this.examCode) {
    this.examCode = `EXAM${Date.now()}`.toUpperCase();
  }
  next();
});

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
