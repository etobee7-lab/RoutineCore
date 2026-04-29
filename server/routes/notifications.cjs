const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

router.post('/push-subscribe', verifyToken, async (req, res) => {
    try {
        const { subscription } = req.body;
        const { username } = req.user;
        if (!subscription) return res.status(400).json({ error: "정보 부족" });

        const subJson = JSON.stringify(subscription);
        const [existing] = await pool.query("SELECT * FROM push_subscriptions WHERE username = ? AND subscription = ?", [username, subJson]);
        if (existing.length === 0) {
            await pool.query("INSERT INTO push_subscriptions (username, subscription, createdAt) VALUES (?, ?, ?)", [username, subJson, Date.now()]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
