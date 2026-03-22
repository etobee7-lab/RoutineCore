const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const cron = require('node-cron');
const pointCalculator = require('./services/pointCalculator.cjs');
const notificationService = require('./services/notificationService.cjs');


// NotificationService에서 관리하므로 VAPID 설정 중복 제거


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'PATCH' || req.method === 'POST') {
        console.log("Body:", JSON.stringify(req.body));
    }
    next();
});

// 회원가입 API
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        if (!username || !password) return res.status(400).json({ error: "필수 정보가 누락되었습니다." });

        const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
        if (existing.length > 0) return res.status(400).json({ error: "이미 존재하는 아이디입니다." });

        await pool.query("INSERT INTO users (username, password, name, createdAt) VALUES (?, ?, ?, ?)", [username, password, name || '', Date.now()]);
        res.status(201).json({ success: true, message: "회원가입 성공!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
        if (users.length > 0) {
            res.json({ success: true, username: users[0].username, name: users[0].name || '' });
        } else {
            res.status(401).json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

let pool;

// 비밀번호 변경 API
app.post('/api/change-password', async (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        if (!username || !currentPassword || !newPassword) return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
        if (newPassword.length < 4) return res.status(400).json({ error: "새 비밀번호는 4자리 이상이어야 합니다." });

        const [users] = await pool.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, currentPassword]);
        if (users.length === 0) return res.status(401).json({ error: "현재 비밀번호가 일치하지 않습니다." });

        await pool.query("UPDATE users SET password = ? WHERE username = ?", [newPassword, username]);
        res.json({ success: true, message: "비밀번호가 변경되었습니다." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 프로필(아바타) 업데이트 API
app.post('/api/update-profile', async (req, res) => {
    try {
        const { username, avatar } = req.body;
        if (!username) return res.status(400).json({ error: "필수 정보가 누락되었습니다." });
        try { await pool.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(10) DEFAULT '😊'"); } catch (e) { /* ignore */ }
        await pool.query("UPDATE users SET avatar = ? WHERE username = ?", [avatar, username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 프로필 조회 API
app.get('/api/profile', async (req, res) => {
    try {
        const username = req.query.username;
        if (!username) return res.status(400).json({ error: "username 필요" });
        try { await pool.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT '😊'"); } catch (e) { /* ignore */ }
        try { await pool.query("ALTER TABLE users ADD COLUMN points INT DEFAULT 0"); } catch (e) { /* ignore */ }
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



// 푸시 알람 구독 저장 API
app.post('/api/push-subscribe', async (req, res) => {
    try {
        const { username, subscription } = req.body;
        if (!username || !subscription) return res.status(400).json({ error: "정보 부족" });

        const subJson = JSON.stringify(subscription);
        // 중복 체크
        const [existing] = await pool.query("SELECT * FROM push_subscriptions WHERE username = ? AND subscription = ?", [username, subJson]);
        if (existing.length === 0) {
            await pool.query("INSERT INTO push_subscriptions (username, subscription, createdAt) VALUES (?, ?, ?)", [username, subJson, Date.now()]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        pool = mysql.createPool(dbConfig);

        // [남개발 부장] 하위 호환성을 위해 기존 todos 테이블 유지
        await pool.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                scheduleMode VARCHAR(20) DEFAULT 'routine',
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL
            )
        `);

        // [남개발 부장] 고도화된 전문 테이블 3종 세트 구축
        await pool.query(`
            CREATE TABLE IF NOT EXISTS routines (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
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
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) DEFAULT '',
                createdAt BIGINT
            )
        `);

        // 인덱싱 최적화
        try { await pool.query(`CREATE INDEX idx_routines_alert ON routines (time, completed, lastNotifiedDate)`); } catch (e) { }
        try { await pool.query(`CREATE INDEX idx_schedules_alert ON schedules (time, completed, lastNotifiedDate)`); } catch (e) { }
        try { await pool.query(`CREATE INDEX idx_routines_user ON routines (username)`); } catch (e) { }

        // 마스터 계정 확인
        const [users] = await pool.query("SELECT * FROM users WHERE username = 'master'");
        if (users.length === 0) {
            await pool.query("INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)", ['master', '2tobee', Date.now()]);
            console.log("Master account created (master/2tobee)");
        }

        console.log("Database initialized with split tables.");
    } catch (err) {
        console.error("DB Init Failed:", err.message);
    }
}


async function startServer() {
    await initDB();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${PORT}`);
    });

    // 매일 자정(24시)에 실행되는 크론 잡
    cron.schedule('0 0 * * *', async () => {
        console.log(`[CRON] 자정 정산 시작 - ${new Date().toISOString()}`);
        try {
            const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
            // 어제 요일 계산 (자정에 실행되므로 어제 기준)
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const dayStr = DAYS[yesterdayDate.getDay()];

            const [users] = await pool.query("SELECT username FROM users");
            for (const user of users) {
                // [남개발 부장] 자정 정산은 반복성 과업인 'routines' 테이블을 기준으로 수행
                const [routines] = await pool.query("SELECT * FROM routines WHERE username = ?", [user.username]);

                let totalMissions = 0;
                let completedMissions = 0;

                for (const routine of routines) {
                    const scheduledDays = routine.days ? routine.days.split(',') : [];
                    if (scheduledDays.includes(dayStr)) {
                        totalMissions++;
                        if (routine.completed) {
                            completedMissions++;
                        }
                    }
                }

                if (totalMissions > 0) {
                    // [남개발 부장] 검증된 pointCalculator 서비스로 정산 로직 수행
                    const percent = pointCalculator.calculateDailyPoints(routines, dayStr);

                    if (percent > 0) {
                        await pool.query("UPDATE users SET points = points + ? WHERE username = ?", [percent, user.username]);
                        console.log(`[CRON] ${user.username}님 어제(${dayStr}) 미션 정산: ${percent} 포인트 지급 (완료건수: ${completedMissions})`);
                    }
                }

                // 2. '루틴(routine)' 모드는 완료/실패 상태만 초기화 (다음 날 재빌드)
                await pool.query("UPDATE routines SET completed = false, isFailed = false WHERE username = ?", [user.username]);
                // [남개발 부장] 일정(schedules)도 완료 상태 초기화가 필요하다면 여기서 수행 (요청 시 추가 가능)
            }
            console.log(`[CRON] 자정 정산 및 데이터 정리 완료 (일정 삭제/루틴 초기화)`);
        } catch (err) {
            console.error("[CRON] 정산 중 오류 발생:", err.message);
        }
    });

    // 매 분마다 실행하여 푸시 알람 발송
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
            const todayStr = DAYS[now.getDay()];
            const h24 = String(now.getHours()).padStart(2, '0');
            const m24 = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${h24}:${m24}`;
            const todayDate = now.toLocaleDateString();

            // [남개발 부장] 루틴과 일정을 통합 감시하여 알림 송출
            const tables = ['routines', 'schedules'];
            for (const tableName of tables) {
                const [pendingItems] = await pool.query(
                    `SELECT * FROM ${tableName} WHERE time = ? AND completed = false AND (lastNotifiedDate IS NULL OR lastNotifiedDate != ?)`,
                    [currentTime, todayDate]
                );

                for (const item of pendingItems) {
                    const scheduledDays = item.days ? item.days.split(',').map(d => d.trim()) : [];
                    if (!scheduledDays.includes(todayStr)) continue;

                    const [subs] = await pool.query("SELECT subscription FROM push_subscriptions WHERE username = ?", [item.username]);

                    const notificationPayload = {
                        title: `RoutineCore ${tableName === 'routines' ? '루틴' : '일정'} 알람`,
                        body: `${item.text} 시간입니다!`,
                        icon: '/logo192.png',
                        data: { todoId: item.id, username: item.username, type: tableName }
                    };

                    const broadcastResult = await notificationService.broadcast(subs, notificationPayload);

                    if (broadcastResult.cleanupNeeded.length > 0) {
                      for (const sub of broadcastResult.cleanupNeeded) {
                          await pool.query("DELETE FROM push_subscriptions WHERE subscription = ?", [sub]);
                      }
                    }

                    await pool.query(`UPDATE ${tableName} SET lastNotifiedDate = ? WHERE id = ?`, [todayDate, item.id]);
                    console.log(`[PUSH] Multi-channel notification sent: ${item.text} from ${tableName}`);
                }
            }

        } catch (err) {
            console.error("[PUSH] 알림 발송 에러:", err.message);
        }
    });
}

startServer();


// ===== AFFIRMATIONS (사용자별) =====
app.get('/api/affirmations', async (req, res) => {
    try {
        const username = req.query.username || 'master';
        const [rows] = await pool.query("SELECT * FROM affirmations WHERE username = ? ORDER BY createdAt DESC", [username]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/affirmations', async (req, res) => {
    try {
        const { text, type, username } = req.body;
        const user = username || 'master';
        const msgType = type === 'tough' ? 'tough' : 'positive';
        await pool.query("INSERT INTO affirmations (text, type, username, createdAt) VALUES (?, ?, ?, ?)", [text, msgType, user, Date.now()]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/affirmations/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM affirmations WHERE id = ?", [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/affirmations/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { text, type } = req.body;
        const fields = [];
        const values = [];
        if (text !== undefined) {
            fields.push("text = ?");
            values.push(text);
        }
        if (type !== undefined) {
            fields.push("type = ?");
            values.push(type === 'tough' ? 'tough' : 'positive');
        }

        if (fields.length === 0) return res.json({ success: true });

        values.push(id);
        await pool.query(`UPDATE affirmations SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== TODOS (사용자별) =====
// ===== TODOS (통합 인터페이스) =====
app.get('/api/todos', async (req, res) => {
    try {
        const username = req.query.username || 'master';
        const includeInactive = req.query.includeInactive === 'true'; // 주간 관리자용

        // [남개발 부장] 현재 주차 코드를 생성 (월요일 날짜 기준)
        const now = new Date();
        now.setHours(0,0,0,0);
        const day = now.getDay();
        const diff = now.getDate() - (day === 0 ? 6 : day - 1);
        const monday = new Date(now.setDate(diff));
        const currentWeekStr = monday.toISOString().split('T')[0];

        // [남개발 부장] 신규 분리 테이블 3종을 통합하여 프런트엔드에 전달
        // 루틴은 항상 포함, 일정/메모는 활성화된 주차만 포함 (includeInactive가 true면 전체 포함)
        const query = `
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'routine' as scheduleMode, username, createdAt, lastNotifiedDate, NULL as activatedWeek FROM routines WHERE username = ?
            UNION ALL
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'schedule' as scheduleMode, username, createdAt, lastNotifiedDate, activatedWeek FROM schedules 
            WHERE username = ? AND (? = 'true' OR activatedWeek = ?)
            UNION ALL
            SELECT id, text, time, completed, days, false as excludeHolidays, false as isFailed, 'memo' as scheduleMode, username, createdAt, NULL as lastNotifiedDate, activatedWeek FROM memos 
            WHERE username = ? AND (? = 'true' OR activatedWeek = ?)
            ORDER BY time ASC
        `;
        const [rows] = await pool.query(query, [username, username, String(includeInactive), currentWeekStr, username, String(includeInactive), currentWeekStr]);
        res.json(rows);
    } catch (err) {
        console.error("GET error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const { id, text, time, completed, isFailed, days, excludeHolidays, scheduleMode, username, lastNotifiedDate } = req.body;
        const user = username || 'master';
        const mode = scheduleMode || 'routine';
        
        let targetTable = 'routines';
        if (mode === 'schedule') targetTable = 'schedules';
        else if (mode === 'memo') targetTable = 'memos';

        if (targetTable === 'memos') {
          await pool.query(
              `INSERT INTO ${targetTable} (id, text, time, completed, days, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, text, time, !!completed, days, user, Date.now()]
          );
        } else {
          await pool.query(
              `INSERT INTO ${targetTable} (id, text, time, completed, isFailed, days, excludeHolidays, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, text, time, !!completed, !!isFailed, days, !!excludeHolidays, user, Date.now(), lastNotifiedDate || null]
          );
        }
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("POST error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/todos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;
        const { scheduleMode } = updates;
        
        // 대상 테이블 결정 (없으면 루틴 우선)
        let tables = ['routines', 'schedules', 'memos'];
        if (scheduleMode === 'routine') tables = ['routines'];
        else if (scheduleMode === 'schedule') tables = ['schedules'];
        else if (scheduleMode === 'memo') tables = ['memos'];

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            if (['text', 'time', 'completed', 'isFailed', 'days', 'excludeHolidays', 'lastNotifiedDate'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(['completed', 'excludeHolidays', 'isFailed'].includes(key) ? !!value : value);
            }
        }

        if (fields.length === 0) return res.json({ success: true });

        values.push(id);
        for (const table of tables) {
            await pool.query(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("PATCH error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query("DELETE FROM routines WHERE id = ?", [id]);
        await pool.query("DELETE FROM schedules WHERE id = ?", [id]);
        await pool.query("DELETE FROM memos WHERE id = ?", [id]);
        res.status(204).send();
    } catch (err) {
        console.error("DELETE error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== 주간 일정 활성화 API =====
app.post('/api/todos/activate-weekly', async (req, res) => {
    try {
        const { username, ids, weekStr } = req.body;
        if (!username || !ids || !weekStr) return res.status(400).json({ error: "필수 정보 누락" });

        // [남개발 부장] 선택된 아이템들의 activatedWeek를 현재 주로 업데이트
        // 먼저 해당 사용자의 모든 일정/메모의 활성화를 해당 주차에 대해 초기화(선택 해제 대응)할지는 정책에 따라 결정
        // 여기서는 명시적으로 전달된 ID들만 해당 주로 활성화하고, 나머지는 NULL 처리하거나 유지
        
        // 1. 해당 주차에 대해 모든 일정/메모 초기화 (선택된 것만 다시 활성화하기 위해)
        await pool.query("UPDATE schedules SET activatedWeek = NULL WHERE username = ? AND activatedWeek = ?", [username, weekStr]);
        await pool.query("UPDATE memos SET activatedWeek = NULL WHERE username = ? AND activatedWeek = ?", [username, weekStr]);

        if (ids.length > 0) {
            const placeholders = ids.map(() => "?").join(",");
            await pool.query(`UPDATE schedules SET activatedWeek = ? WHERE id IN (${placeholders})`, [weekStr, ...ids]);
            await pool.query(`UPDATE memos SET activatedWeek = ? WHERE id IN (${placeholders})`, [weekStr, ...ids]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Activate error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ===== 성공의 방 (Success Room) API =====
// 1. 보유 아이템 가져오기
app.get('/api/user-items', async (req, res) => {
    const { username } = req.query;
    try {
        const [rows] = await pool.query("SELECT item_id FROM user_items WHERE username = ?", [username]);
        res.json(rows.map(r => r.item_id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 아이템 구매하기
app.post('/api/purchase-item', async (req, res) => {
    const { username, itemId, cost } = req.body;
    try {
        // 포인트 확인
        const [userRows] = await pool.query("SELECT points FROM users WHERE username = ?", [username]);
        if (userRows.length === 0) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

        const currentPoints = userRows[0].points;
        if (currentPoints < cost) {
            return res.status(400).json({ error: "포인트가 부족합니다." });
        }

        // 아이템 중복 구매 확인 (방 장식용이라 1개씩만)
        const [itemRows] = await pool.query("SELECT id FROM user_items WHERE username = ? AND item_id = ?", [username, itemId]);
        if (itemRows.length > 0) {
            return res.status(400).json({ error: "이미 보유 중인 아이템입니다." });
        }

        // 포인트 차감 및 아이템 추가
        await pool.query("UPDATE users SET points = points - ? WHERE username = ?", [cost, username]);
        await pool.query("INSERT INTO user_items (username, item_id) VALUES (?, ?)", [username, itemId]);

        res.json({ success: true, newPoints: currentPoints - cost });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 성공의 방 아이템 전체 초기화 (비우기)
app.delete('/api/user-items/reset', async (req, res) => {
    const { username } = req.query;
    try {
        await pool.query("DELETE FROM user_items WHERE username = ?", [username]);
        res.json({ success: true, message: "성공의 방이 초기화되었습니다." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== ADMIN (관리자 전용 - 3대 테이블 통합 수출입) =====
app.get('/api/admin/export', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username || username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });

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

app.post('/api/admin/import', async (req, res) => {
    try {
        const { username, importData } = req.body;
        if (!username || username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });
        if (!importData || !importData.data) return res.status(400).json({ error: "데이터가 올바르지 않습니다." });

        const { routines, schedules, memos, affirmations, users } = importData.data;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            if (routines) {
                await connection.query("DELETE FROM routines");
                for (const r of routines) {
                    await connection.query(
                        "INSERT INTO routines (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [r.id, r.text, r.time, r.completed, r.days, r.excludeHolidays, r.isFailed, r.username, r.createdAt, r.lastNotifiedDate]
                    );
                }
            }
            if (schedules) {
                await connection.query("DELETE FROM schedules");
                for (const s of schedules) {
                    await connection.query(
                        "INSERT INTO schedules (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [s.id, s.text, s.time, s.completed, s.days, s.excludeHolidays, s.isFailed, s.username, s.createdAt, s.lastNotifiedDate]
                    );
                }
            }
            if (memos) {
                await connection.query("DELETE FROM memos");
                for (const m of memos) {
                    await connection.query(
                        "INSERT INTO memos (id, text, time, completed, days, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [m.id, m.text, m.time, m.completed, m.days, m.username, m.createdAt]
                    );
                }
            }

            if (affirmations) {
                await connection.query("DELETE FROM affirmations");
                for (const aff of affirmations) {
                    await connection.query(
                        "INSERT INTO affirmations (text, type, username, createdAt) VALUES (?, ?, ?, ?)",
                        [aff.text, aff.type, aff.username, aff.createdAt]
                    );
                }
            }

            if (users) {
                await connection.query("DELETE FROM users");
                for (const u of users) {
                    await connection.query(
                        "INSERT INTO users (username, password, name, avatar, points, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
                        [u.username, u.password, u.name, u.avatar, u.points, u.createdAt]
                    );
                }
            }

            await connection.commit();
            res.json({ success: true, message: "차세대 데이터 복구 완료!" });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 2. 루트 경로(/) 명시적 처리 (가장 우선순위)
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    // 브라우저 캐시 방지 헤더 추가
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Root index.html send failed:", err.message);
            res.status(404).send("dist/index.html not found. Please run 'npm run build'.");
        }
    });
});

// 3. 빌드된 정적 파일(assets 등) 서비스
app.use(express.static(path.join(__dirname, 'dist')));

// 관리자 데이터 내보내기 (Export) 및 가져오기 (Import) 이동 완료


// 4. SPA 라우팅 지원 (기타 경로 접속 시)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
            if (err) next();
        });
    }
    next();
});

// 서버 시작 및 크론 잡 설정이 상단 startServer()로 이동되었습니다.
