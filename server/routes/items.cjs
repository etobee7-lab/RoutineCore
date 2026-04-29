const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

router.get('/', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        const [rows] = await pool.query("SELECT item_id FROM user_items WHERE username = ?", [username]);
        res.json(rows.map(r => r.item_id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/purchase', verifyToken, async (req, res) => {
    const { itemId, cost } = req.body;
    const { username } = req.user;
    try {
        const [userRows] = await pool.query("SELECT points FROM users WHERE username = ?", [username]);
        if (userRows.length === 0) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

        const currentPoints = userRows[0].points;
        if (currentPoints < cost) return res.status(400).json({ error: "포인트가 부족합니다." });

        const [itemRows] = await pool.query("SELECT id FROM user_items WHERE username = ? AND item_id = ?", [username, itemId]);
        if (itemRows.length > 0) return res.status(400).json({ error: "이미 보유 중인 아이템입니다." });

        await pool.query("UPDATE users SET points = points - ? WHERE username = ?", [cost, username]);
        await pool.query("INSERT INTO user_items (username, item_id) VALUES (?, ?)", [username, itemId]);

        res.json({ success: true, newPoints: currentPoints - cost });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/reset', verifyToken, async (req, res) => {
    const { username } = req.user;
    try {
        await pool.query("DELETE FROM user_items WHERE username = ?", [username]);
        res.json({ success: true, message: "성공의 방이 초기화되었습니다." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
