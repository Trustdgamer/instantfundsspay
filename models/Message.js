const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },    // e.g. 'admin' or user email
  receiver: { type: String, required: true },  // e.g. 'admin' or user email
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model("Message", MessageSchema);
