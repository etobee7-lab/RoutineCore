const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

router.get('/', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        const [rows] = await pool.query("SELECT * FROM affirmations WHERE username = ? ORDER BY createdAt DESC", [username]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', verifyToken, async (req, res) => {
    try {
        const { text, type } = req.body;
        const { username } = req.user;
        const msgType = type === 'tough' ? 'tough' : 'positive';
        await pool.query("INSERT INTO affirmations (text, type, username, createdAt) VALUES (?, ?, ?, ?)", [text, msgType, username, Date.now()]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await pool.query("DELETE FROM affirmations WHERE id = ?", [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
