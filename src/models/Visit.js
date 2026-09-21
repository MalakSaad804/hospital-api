const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor is required"],
    },
    visitDate: {
      type: Date,
      required: [true, "Visit date is required"],
    },
    reason: {
      type: String,
      required: [true, "Reason for the visit is required"],
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [1000, "Diagnosis cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["scheduled", "completed", "cancelled"],
        message: "Status must be scheduled, completed or cancelled",
      },
      default: "scheduled",
    },
    fee: {
      type: Number,
      min: [0, "Fee cannot be negative"],
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

/* ---------- Virtual ---------- */
visitSchema.virtual("isUpcoming").get(function () {
  return this.status === "scheduled" && this.visitDate > new Date();
});

/* ---------- Indexes ---------- */
visitSchema.index({ patient: 1, visitDate: -1 }); // history of one patient
visitSchema.index({ doctor: 1, visitDate: -1 }); // schedule of one doctor
visitSchema.index({ status: 1 });

module.exports = mongoose.model("Visit", visitSchema);
