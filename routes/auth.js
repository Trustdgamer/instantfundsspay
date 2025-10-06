const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { User, Token, sendVerificationEmail, sendResetEmail, genTokenHex } = require('../server');


// --------------------
// REGISTER
// --------------------
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email: email.toLowerCase(), password: hashed, name: name || '' });
    await user.save();

    const token = genTokenHex(16);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await Token.create({ userId: user._id, token, type: 'verify', expiresAt });
    await sendVerificationEmail(user.email, token);

    res.status(201).json({ message: 'User registered successfully. Verification email sent.' });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --------------------
// VERIFY EMAIL
// --------------------
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const tokenDoc = await Token.findOne({ token, type: 'verify' });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      if (tokenDoc) await tokenDoc.deleteOne();
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isVerified = true;
    await user.save();
    await tokenDoc.deleteOne();

    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('verify-email error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// LOGIN
/// --------------------
// LOGIN (with IP + location tracking)
// --------------------
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
// make sure to install this: npm i node-fetch

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // --- Detect IP address (handles proxies too) ---
    let ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.headers["cf-connecting-ip"] ||
      req.socket.remoteAddress ||
      req.ip;

    // --- Fallback for localhost testing ---
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "8.8.8.8"; // fallback IP (Google DNS)
    }

    // --- Look up location using ipinfo.io ---
    let location = "Unknown";
    try {
      
      const token = process.env.IPINFO_TOKEN; // 👈 store your token in .env
      console.log("Using token:", process.env.IPINFO_TOKEN);

      const geo = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`).then((r) => r.json());
      if (geo && geo.country) {
        const city = geo.city || "Unknown City";
        const country = geo.country || "Unknown Country";
        location = `${city}, ${country}`;
      }
    } catch (geoErr) {
      console.error("Geo lookup failed:", geoErr.message);
    }

    // --- Save IP + location in user ---
    user.lastIp = ip;
    user.location = location;
    await user.save();

    // --- Issue JWT and respond ---
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    res.json({ token, role: user.role || "user", location });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ message: "Server error" });
  }
});





/*router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    res.json({ token, role: user.role || 'user' });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});*/

// --------------------
// FORGOT PASSWORD
// --------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json({ message: 'If the email exists we sent a reset link' });

    await Token.deleteMany({ userId: user._id, type: 'reset' });

    const token = genTokenHex(20);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    await Token.create({ userId: user._id, token, type: 'reset', expiresAt });
    await sendResetEmail(user.email, token);

    res.json({ message: 'If the email exists we sent a reset link' });
  } catch (err) {
    console.error('forgot-password error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// RESET PASSWORD
// --------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and newPassword required' });

    const tokenDoc = await Token.findOne({ token, type: 'reset' });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      if (tokenDoc) await tokenDoc.deleteOne();
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await tokenDoc.deleteOne();

    res.json({ success: true, message: 'Password has been reset' });
  } catch (err) {
    console.error('reset-password error', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
