// attendanceSchema.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    studentPic: {
      type: String,
      default: null,
    },

    attendanceMark: {
      type: String,
      enum: ["Present", "Absent"],
      default: "Absent",
      required: true, // 🚨 CRITICAL: Required by Mongoose
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // 🚨 CRITICAL: Required by Mongoose
      unique: true, // 🚨 CRITICAL: Unique constraint
    },

    attendanceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    markedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Ensures a student can only have one attendance entry per day (when marked)
attendanceSchema.index({ student: 1, attendanceDate: 1 }, { unique: true });
const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;