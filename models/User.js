const mongoose = require("mongoose");

// Schema for watch history
const historySchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: String,
  url: String,
  watchedAt: { type: Date, default: Date.now }
});

// Schema for liked videos
const likeSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: String,
  url: String,
  likedAt: { type: Date, default: Date.now }
});

// Main user schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },

    // Email verification & reset password
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },

    // Store detailed likes & history
    history: [historySchema],
    likes: [likeSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
