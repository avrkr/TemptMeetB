const express = require('express');
const router = express.Router();

// Your API routes - no CORS needed here since it's applied globally
router.get('/online-users', async (req, res) => {
    try {
        const onlineUsers = await User.find({ isOnline: true });
        res.json({ count: onlineUsers.length, users: onlineUsers });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/languages', async (req, res) => {
    try {
        const languages = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean'];
        res.json(languages);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;