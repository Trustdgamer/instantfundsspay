const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const Video = require("../models/Video");
const User = require("../models/User");


const router = express.Router();
// At the top of admin.js
router.use((req, res, next) => {
  // Grab client IP from proxy headers or direct socket
  req.clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  next();
});
// ================= Multer Setup =================
const storage = multer.memoryStorage();
const upload = multer({ storage });
const geoip = require('geoip-lite');

// ================= Cloudinary Config =================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================= UPLOAD LOCAL VIDEO =================
router.post("/videos/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const stream = cloudinary.uploader.upload_stream(
  { 
    resource_type: "video", 
    folder: "myapp_videos",
    timeout: 120000 // 2 minutes
  },
      async (error, uploaded) => {
        if (error) return res.status(500).json({ error: "Cloudinary upload failed: " + error.message });

        const newVideo = new Video({
          title: req.body.title || "Untitled Video",
          url: uploaded.secure_url,
          cloudinary_id: uploaded.public_id,
          uploadedBy: "admin",
        });

        await newVideo.save();
        res.json({ message: "Video uploaded", video: newVideo });
      }
    );

    stream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get like stats for all videos
// Get like stats for all videos
router.get("/video-stats", async (req, res) => {
  try {
    // Aggregate likes from all users
    const users = await User.find({}, "likes"); // only get likes field
    const likeMap = {};

    users.forEach(u => {
      (u.likes || []).forEach(like => {
        likeMap[like.videoId] = (likeMap[like.videoId] || 0) + 1;
      });
    });

    res.json(likeMap); // { videoId1: count, videoId2: count, ... }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= ADD YOUTUBE VIDEO =================
router.post("/videos/youtube", async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!url) return res.status(400).json({ error: "YouTube URL is required" });

    const ytRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    if (!ytRegex.test(url)) return res.status(400).json({ error: "Invalid YouTube URL" });

    const newVideo = new Video({
      title: title || "Untitled Video",
      url,
      uploadedBy: "admin",
    });

    await newVideo.save();
    res.json({ message: "YouTube video added", video: newVideo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET ALL VIDEOS =================
router.get("/videos", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE VIDEO =================
router.delete("/videos/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    if (video.cloudinary_id) {
      await cloudinary.uploader.destroy(video.cloudinary_id, { resource_type: "video" });
    }

    await video.deleteOne();
    res.json({ message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GET USERS =================

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    const enhancedUsers = users.map(u => {
      const geo = geoip.lookup(u.lastIp) || {};
      return {
        _id: u._id,
        email: u.email,
        role: u.role,
        ip: u.lastIp || 'N/A',
        location: geo.country || 'Unknown',
      };
    });
    res.json(enhancedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= DELETE USER =================
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// After login is successful


module.exports = router;
