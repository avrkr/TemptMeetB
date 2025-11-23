import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    reporterId: {
        type: String,
        required: true
    },
    reportedUserId: {
        type: String,
        required: true
    },
    roomId: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: ['harassment', 'spam', 'inappropriate', 'other']
    },
    description: {
        type: String,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved'],
        default: 'pending'
    }
}, {
    timestamps: true
});

export default mongoose.model('Report', ReportSchema);