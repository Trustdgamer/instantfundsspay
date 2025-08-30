require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
const nodemailer = require('nodemailer');

// ================== MONGODB ==================
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log(err));

// ================== MODELS ==================
const User = require('./models/User');
const Video = require('./models/Video');

// ================== TOKEN SCHEMA ==================
const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

// ================== HELPERS ==================
function genTokenHex(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}

// ================== AUTH MIDDLEWARE ==================
const authMiddleware = async (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  const token = tokenHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Admin token
    if (decoded.role === 'admin') {
      req.user = { role: 'admin', email: decoded.email };
      return next();
    }

    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ================== AUTH ROUTES ==================
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email: email.toLowerCase(), password: hashed, name: name || '' });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Admin login
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, role: 'admin' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role || 'user' });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== FORGOT & RESET PASSWORD ==================
// Forgot password

// server.js



app.use(express.urlencoded({ extended: true }));


// --- In-memory store (replace with DB in production) ---
let resetCodes = {}; // { email: { code: "123456", expires: timestamp } }

// --- Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // use TLS (false for 587, true for 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // 👈 allows self-signed certs
  }
});


// --- Forgot Password Route (Send Reset Code) ---
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  // Generate a 6-digit numeric code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  resetCodes[email] = {
    code: resetCode,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes validity
  };

  try {
    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset Code",
      text: `Your reset code is: ${resetCode}\nIt expires in 15 minutes.`,
    });

    res.json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.error("Forgot password error", error);
    res.status(500).json({ message: "Failed to send reset code" });
  }
});

// --- Verify Reset Code ---
app.post("/verify-reset-code", (req, res) => {
  const { email, code } = req.body;
  const record = resetCodes[email];

  if (!record) return res.status(400).json({ message: "No reset requested" });

  if (Date.now() > record.expires) {
    delete resetCodes[email];
    return res.status(400).json({ message: "Code expired" });
  }

  if (record.code !== code)
    return res.status(400).json({ message: "Invalid code" });

  res.json({ message: "Code verified successfully" });
});

// --- Reset Password ---
app.post("/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;
  const record = resetCodes[email];

  if (!record) return res.status(400).json({ message: "No reset requested" });
  if (record.code !== code) return res.status(400).json({ message: "Invalid code" });

  // Here you’d update the user’s password in your DB
  console.log(`Password for ${email} reset to ${newPassword}`);

  delete resetCodes[email];
  res.json({ message: "Password reset successful" });
});



// ================== VIDEO & USER ROUTES ==================
app.get('/api/videos', authMiddleware, async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

// Likes
app.post("/api/like", authMiddleware, async (req, res) => {
  try {
    const { videoId, title, url } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.likes) user.likes = [];
    const alreadyLiked = user.likes.find(like => like.videoId === videoId);
    if (alreadyLiked) return res.json({ message: "Already liked" });

    user.likes.push({ videoId, title, url, likedAt: new Date() });
    await user.save();
    res.json({ success: true, likes: user.likes });
  } catch (err) {
    console.error('Like error', err);
    res.status(500).json({ error: "Server error" });
  }
});

// History
app.post("/api/history", authMiddleware, async (req, res) => {
  try {
    const { videoId, title, url } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.history) user.history = [];
    user.history.push({ videoId, title, url, watchedAt: new Date() });
    await user.save();
    res.json({ success: true, history: user.history });
  } catch (err) {
    console.error('History error', err);
    res.status(500).json({ error: "Server error" });
  }
});

// User info
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("email likes history");
    res.json(user);
  } catch (err) {
    console.error('/api/me error', err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== ADMIN ROUTES ==================
const adminRouter = require('./routes/admin');
app.use('/api/admin', authMiddleware, adminRouter);

// ================== STATIC FILES ==================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
