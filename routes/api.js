const router = require('express').Router();
const User = require('../models/User');
const Report = require('../models/Report');

// Get Dynamic Languages
router.get('/languages', (req, res) => {
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'hi', name: 'Hindi' },
        { code: 'zh', name: 'Chinese' },
        { code: 'jp', name: 'Japanese' }
    ];
    res.json(languages);
});

// Get Online Users Count
router.get('/online-users', async (req, res) => {
    try {
        // In a real app, count from DB or Redis. 
        // Since we are using in-memory socket tracking for matching, 
        // we can also query the DB if we are syncing them.
        const count = await User.countDocuments({ isOnline: true });
        // Add a fake multiplier for "social proof" if count is low during dev
        res.json({ count: Math.max(count, 12) });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Report User
router.post('/report', async (req, res) => {
    try {
        const { reporterId, reportedUserId, reason } = req.body;
        await Report.create({ reporterId, reportedUserId, reason });
        res.json({ success: true, message: 'User reported' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to report' });
    }
});

// Face Detection Mock Endpoint
router.post('/detect-face', (req, res) => {
    // In production, use a library like face-api.js or AWS Rekognition
    // Here we simulate a successful check
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Randomly simulate "No face detected" for testing (1 in 20 chance)
    const faceDetected = Math.random() > 0.05;

    res.json({
        faceDetected,
        warning: faceDetected ? null : "Please show your face clearly!"
    });
});

module.exports = router;
