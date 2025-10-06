const mongoose = require("mongoose");

// Schema for watch history
const historySchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: String,
  url: String,
  watchedAt: { type: Date, default: Date.now },
});

// Schema for liked videos
const likeSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: String,
  url: String,
  likedAt: { type: Date, default: Date.now },
});

// Main User Schema
const userSchema = new mongoose.Schema(
  {
    // Basic info
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },

    // Email verification & password reset
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    resetToken: String,
    resetTokenExpiry: Date,

    // Engagement data
    history: [historySchema],
    likes: [likeSchema],

    // Account balance (optional)
    balance: { type: Number, default: 0 },

    // --- Tracking info ---
    lastIp: { type: String, default: "N/A" },
    location: { type: String, default: "Unknown" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);




/*const mongoose = require("mongoose");

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
    likes: [likeSchema],

    // 👇 Account balance
    balance: { type: Number, default: 0 },

    // 👇 Track last known IP address
    lastIp: { type: String },

    // 👇 Track user's approximate location
    location: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);*/







/*const mongoose = require("mongoose");

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

module.exports = mongoose.models.User || mongoose.model("User", userSchema);*/
