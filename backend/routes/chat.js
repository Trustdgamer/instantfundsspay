const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const adminEmail = process.env.ADMIN_EMAIL || 'adminfunds@gmail.com';

// Chat message schema
const chatMessageSchema = new mongoose.Schema({
  sender: String,
  recipient: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

// Middleware: simple auth - expect Bearer token
const authMiddleware = async (req, res, next) => {
  const tokenHeader = req.headers.authorization;
  if (!tokenHeader) return res.status(401).json({ message: 'No token' });
  
  const token = tokenHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains email etc
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Send message to admin
router.post('/send-to-admin', authMiddleware, async (req, res) => {
  try {
    const sender = req.user.email;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const chatMsg = new ChatMessage({ sender, recipient: adminEmail, message });
    await chatMsg.save();

    res.json({ message: 'Sent to admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin fetches messages sent to them
router.get('/admin-messages', authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }

    const messages = await ChatMessage.find({ recipient: adminEmail }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET messages with a specific user (admin only)
router.get('/messages/:userEmail', authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }

    const userEmail = req.params.userEmail;

    // Find messages between admin and this user
    const messages = await ChatMessage.find({
      $or: [
        { sender: adminEmail, recipient: userEmail },
        { sender: userEmail, recipient: adminEmail }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User fetches their own chat history (with admin)
router.get('/my-messages', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const messages = await ChatMessage.find({
      $or: [
        { sender: userEmail, recipient: adminEmail },
        { sender: adminEmail, recipient: userEmail }
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST send message from admin to user
router.post('/messages/:userEmail', authMiddleware, async (req, res) => {
  try {
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Forbidden: Admin only' });
    }

    const userEmail = req.params.userEmail;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const chatMsg = new ChatMessage({ sender: adminEmail, recipient: userEmail, message });
    await chatMsg.save();

    res.json({ message: 'Message sent to user' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
