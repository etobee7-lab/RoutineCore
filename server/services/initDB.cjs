const pool = require('../config/db.cjs');

async function initDB() {
    try {
        // 기존 server.cjs의 initDB 로직을 기반으로 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                startDate VARCHAR(20) DEFAULT NULL,
                endDate VARCHAR(20) DEFAULT NULL,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                scheduleMode VARCHAR(20) DEFAULT 'routine',
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS routines (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                startDate VARCHAR(20) DEFAULT NULL,
                endDate VARCHAR(20) DEFAULT NULL,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                startDate VARCHAR(20) DEFAULT NULL,
                endDate VARCHAR(20) DEFAULT NULL,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL,
                priority INT DEFAULT 0,
                activatedWeek VARCHAR(20) DEFAULT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS memos (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                startDate VARCHAR(20) DEFAULT NULL,
                endDate VARCHAR(20) DEFAULT NULL,
                days VARCHAR(100),
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                category VARCHAR(50) DEFAULT 'general',
                isPinned BOOLEAN DEFAULT FALSE,
                activatedWeek VARCHAR(20) DEFAULT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS affirmations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                type VARCHAR(20) DEFAULT 'positive',
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                subscription TEXT NOT NULL,
                createdAt BIGINT
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                name VARCHAR(100) DEFAULT '',
                createdAt BIGINT,
                avatar VARCHAR(255) DEFAULT '😊',
                points INT DEFAULT 0,
                alarmFilter VARCHAR(20) DEFAULT 'all'
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS achievement_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                date VARCHAR(20) NOT NULL,
                total_missions INT DEFAULT 0,
                completed_missions INT DEFAULT 0,
                points_earned INT DEFAULT 0,
                createdAt BIGINT,
                UNIQUE KEY idx_user_date (username, date)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_completions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                todo_id BIGINT NOT NULL,
                date VARCHAR(20) NOT NULL,
                username VARCHAR(50) NOT NULL,
                createdAt BIGINT,
                UNIQUE KEY idx_todo_date (todo_id, date)
            )
        `);

        // 성공의 방 아이템 테이블
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                UNIQUE KEY idx_user_item (username, item_id)
            )
        `);

        console.log("Database tables checked/created.");
    } catch (err) {
        console.error("DB Init Error:", err.message);
        throw err;
    }
}

module.exports = initDB;
