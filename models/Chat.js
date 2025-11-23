import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 1000
    },
    messageType: {
        type: String,
        enum: ['text', 'system'],
        default: 'text'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for room messages
ChatSchema.index({ roomId: 1, timestamp: 1 });

export default mongoose.model('Chat', ChatSchema);