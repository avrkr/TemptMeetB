import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    socketId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    interests: [{
        type: String,
        trim: true
    }],
    language: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: 'Unknown'
    },
    mode: {
        type: String,
        enum: ['text', 'video'],
        default: 'text'
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    connectionCount: {
        type: Number,
        default: 0
    },
    totalTimeSpent: {
        type: Number, // in minutes
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
UserSchema.index({ socketId: 1 });
UserSchema.index({ isOnline: 1 });
UserSchema.index({ language: 1 });
UserSchema.index({ interests: 1 });

export default mongoose.model('User', UserSchema);