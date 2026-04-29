const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

router.get('/users', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        if (username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });

        const [users] = await pool.query("SELECT username, name, avatar, points, createdAt FROM users ORDER BY createdAt DESC");
        res.json({ users, count: users.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/export', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        if (username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });

        const [routines] = await pool.query("SELECT * FROM routines");
        const [schedules] = await pool.query("SELECT * FROM schedules");
        const [memos] = await pool.query("SELECT * FROM memos");
        const [affirmations] = await pool.query("SELECT * FROM affirmations");
        const [users] = await pool.query("SELECT username, password, name, avatar, points, createdAt FROM users");

        res.json({
            version: "2.0 (Split Tables)",
            exportDate: new Date().toISOString(),
            data: { routines, schedules, memos, affirmations, users }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
