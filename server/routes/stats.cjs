const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

router.get('/heatmap', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const dateLimit = oneYearAgo.toISOString().split('T')[0];

        const [rows] = await pool.query(
            "SELECT date, total_missions, completed_missions, points_earned FROM achievement_logs WHERE username = ? AND date >= ? ORDER BY date ASC",
            [username, dateLimit]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
