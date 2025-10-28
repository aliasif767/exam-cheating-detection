import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "invigilator", "student"],
      required: true,
    },
    studentId: {
     type: String,
      required: function() { 
      return this.role === 'student'; 
     },
      sparse: true, 
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    faceData: {
      type: String, // Encoded face descriptor
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
// Hash password before saving
userSchema.pre("save", async function (next) {
 if (!this.isModified("password")) return next();

 try {
// CHANGE 12 TO 10 (or even 8 if the issue persists)
   const salt = await bcrypt.genSalt(10); 
  this.password = await bcrypt.hash(this.password, salt);
   next();
 } catch (error) {
  next(error);
}
});
// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Transform JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
