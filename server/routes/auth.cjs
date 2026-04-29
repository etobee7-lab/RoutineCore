const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db.cjs');
const { JWT_SECRET, verifyToken } = require('../middleware/auth.cjs');

// 회원가입
router.post('/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        if (!username || !password) return res.status(400).json({ error: "필수 정보가 누락되었습니다." });

        const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        if (existing.length > 0) return res.status(400).json({ error: "이미 존재하는 아이디입니다." });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (username, password, name, createdAt) VALUES (?, ?, ?, ?)", [username, hashedPassword, name || '', Date.now()]);
        res.status(201).json({ success: true, message: "회원가입 성공!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }

        const match = await bcrypt.compare(password, users[0].password);
        if (match) {
            const token = jwt.sign(
                { username: users[0].username, name: users[0].name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.json({ 
                success: true, 
                token, 
                username: users[0].username, 
                name: users[0].name || '' 
            });
        } else {
            res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 비밀번호 변경
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { username } = req.user;

        if (!currentPassword || !newPassword) return res.status(400).json({ error: "필수 정보가 누락되었습니다." });

        const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        if (users.length === 0) return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
        
        const match = await bcrypt.compare(currentPassword, users[0].password);
        if (!match) return res.status(401).json({ error: "현재 비밀번호가 일치하지 않습니다." });

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password = ? WHERE username = ?", [hashedNewPassword, username]);
        res.json({ success: true, message: "비밀번호가 변경되었습니다." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 프로필 조회
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        const [users] = await pool.query("SELECT username, name, avatar, points FROM users WHERE username = ?", [username]);
        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
