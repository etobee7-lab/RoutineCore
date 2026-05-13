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

        // [실시간 최적화 엔진] 구독을 갱신하거나 새로 등록할 때마다 유저별 활성 구독 개수를 실시간 Pruning!
        const [userSubs] = await pool.query("SELECT id FROM push_subscriptions WHERE username = ? ORDER BY id DESC", [username]);
        const MAX_ACTIVE_DEVICES = 3; // 휴대폰, 데스크톱 PC, 노트북/태블릿까지 최대 3대 멀티 디바이스 보장
        if (userSubs.length > MAX_ACTIVE_DEVICES) {
            const keepIds = userSubs.slice(0, MAX_ACTIVE_DEVICES).map(s => s.id);
            const [deleteResult] = await pool.query("DELETE FROM push_subscriptions WHERE username = ? AND id NOT IN (?)", [username, keepIds]);
            console.log(`[REALTIME-CLEANUP] Stale subscription pruning complete for ${username}: Deleted ${deleteResult.affectedRows} obsolete subscriptions.`);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
