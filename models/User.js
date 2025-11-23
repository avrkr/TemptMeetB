const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    socketId: String,
    interests: [String],
    language: String,
    location: String,
    isOnline: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
