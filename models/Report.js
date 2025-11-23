const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    reporterId: String,
    reportedUserId: String,
    reason: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
