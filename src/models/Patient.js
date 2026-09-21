const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
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
      unique: true, // creates a unique index
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: (value) => value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female or other",
      },
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9\-\s]{7,15}$/, "Please provide a valid phone number"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [255, "Address cannot exceed 255 characters"],
    },
    bloodGroup: {
      type: String,
      enum: {
        values: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        message: "Invalid blood group",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------- Virtual (computed field, not stored in DB) ---------- */
patientSchema.virtual("age").get(function () {
  if (!this.dob) return undefined;
  const today = new Date();
  let age = today.getFullYear() - this.dob.getFullYear();
  const monthDiff = today.getMonth() - this.dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dob.getDate())) {
    age -= 1;
  }
  return age;
});

/* ---------- Indexes ---------- */
patientSchema.index({ name: 1 }); // fast search / sort by name
patientSchema.index({ createdAt: -1 }); // default list order (newest first)

module.exports = mongoose.model("Patient", patientSchema);
