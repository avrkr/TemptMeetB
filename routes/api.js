const router = require('express').Router();
const User = require('../models/User');
const Report = require('../models/Report');

// Get Dynamic Languages (Aggregated from active users or a standard list)
router.get('/languages', async (req, res) => {
    try {
        // Get distinct languages from currently online users
        const activeLanguages = await User.distinct('language', { isOnline: true });

        // Standard list to ensure we always have options
        const standardLanguages = [
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'hi', name: 'Hindi' },
            { code: 'zh', name: 'Chinese' },
            { code: 'jp', name: 'Japanese' },
            { code: 'ru', name: 'Russian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ar', name: 'Arabic' }
        ];

        // Mark languages that are currently active
        const response = standardLanguages.map(lang => ({
            ...lang,
            active: activeLanguages.includes(lang.code)
        }));

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch languages' });
    }
});

// Get Online Users Count
router.get('/online-users', async (req, res) => {
    try {
        const count = await User.countDocuments({ isOnline: true });
        res.json({ count });
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
