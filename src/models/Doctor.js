const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
      maxlength: [100, "Specialization cannot exceed 100 characters"],
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\-\s]{7,15}$/, "Please provide a valid phone number"],
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, "Experience cannot be negative"],
      max: [60, "Experience cannot exceed 60 years"],
    },
    consultationFee: {
      type: Number,
      default: 0,
      min: [0, "Fee cannot be negative"],
    },
    isAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------- Virtual ---------- */
doctorSchema.virtual("displayName").get(function () {
  if (!this.name) return undefined;
  return /^dr\.?\s/i.test(this.name) ? this.name : `Dr. ${this.name}`;
});

/* ---------- Indexes ---------- */
doctorSchema.index({ specialization: 1, isAvailable: 1 }); // "available cardiologists"
doctorSchema.index({ name: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);
