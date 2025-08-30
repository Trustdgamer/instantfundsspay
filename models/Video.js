const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  url: { type: String, required: true },
  cloudinary_id: String,
  likes: { type: Number, default: 0 },
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Video || mongoose.model("Video", videoSchema);
