const router = require('express').Router();

router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Backend is connected and healthy!',
        timestamp: new Date().toISOString()
    });
});

router.post('/echo', (req, res) => {
    const { data } = req.body;
    res.json({
        received: data,
        message: 'Echo successful'
    });
});

module.exports = router;
