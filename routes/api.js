import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Get available languages with user counts
router.get('/languages', async (req, res) => {
    try {
        const User = mongoose.model('User');

        const activeLanguages = await User.aggregate([
            { $match: { isOnline: true } },
            { $group: { _id: '$language', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const standardLanguages = [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Spanish', flag: '🇪🇸' },
            { code: 'fr', name: 'French', flag: '🇫🇷' },
            { code: 'de', name: 'German', flag: '🇩🇪' },
            { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
            { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
            { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
            { code: 'ru', name: 'Russian', flag: '🇷🇺' },
            { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
            { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
            { code: 'it', name: 'Italian', flag: '🇮🇹' },
            { code: 'ko', name: 'Korean', flag: '🇰🇷' }
        ];

        const languagesWithStats = standardLanguages.map(lang => {
            const activeData = activeLanguages.find(al => al._id === lang.code);
            return {
                ...lang,
                active: !!activeData,
                onlineCount: activeData?.count || 0
            };
        });

        res.json(languagesWithStats);
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({ error: 'Failed to fetch languages' });
    }
});

// Get online users count and statistics
router.get('/stats', async (req, res) => {
    try {
        const User = mongoose.model('User');

        const totalOnline = await User.countDocuments({ isOnline: true });
        const languagesCount = await User.distinct('language', { isOnline: true });
        const popularInterests = await User.aggregate([
            { $match: { isOnline: true } },
            { $unwind: '$interests' },
            { $group: { _id: '$interests', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            onlineUsers: totalOnline,
            activeLanguages: languagesCount.length,
            popularInterests: popularInterests.map(pi => ({
                interest: pi._id,
                count: pi.count
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Report user
router.post('/report', async (req, res) => {
    try {
        const { reporterId, reportedUserId, reason, description, roomId } = req.body;

        const Report = mongoose.model('Report');
        await Report.create({
            reporterId,
            reportedUserId,
            reason,
            description,
            roomId
        });

        res.json({ success: true, message: 'User reported successfully' });
    } catch (error) {
        console.error('Error reporting user:', error);
        res.status(500).json({ error: 'Failed to report user' });
    }
});

// Get user chat history
router.get('/chat-history/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 50 } = req.query;

        const Chat = mongoose.model('Chat');
        const messages = await Chat.find({ roomId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Face detection endpoint (mock for now)
router.post('/verify-face', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Simulate face detection
        // In production, integrate with AWS Rekognition, Google Vision API, etc.
        const faceDetected = Math.random() > 0.1; // 90% success rate for demo

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

        res.json({
            success: faceDetected,
            message: faceDetected
                ? 'Face verified successfully'
                : 'No face detected. Please ensure your face is clearly visible.',
            confidence: faceDetected ? (Math.random() * 0.3 + 0.7).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Face verification failed' });
    }
});

export default router;