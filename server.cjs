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

        // 컬럼 추가 (기존 DB 마이그레이션)
        try { await pool.query(`ALTER TABLE todos ADD COLUMN username VARCHAR(50) DEFAULT 'master'`); } catch (e) { }
        try { await pool.query(`ALTER TABLE todos ADD COLUMN isFailed BOOLEAN DEFAULT FALSE`); } catch (e) { }
        try { await pool.query(`ALTER TABLE todos ADD COLUMN scheduleMode VARCHAR(20) DEFAULT 'routine'`); } catch (e) { }
        try {
            await pool.query(`ALTER TABLE todos ADD COLUMN lastNotifiedDate VARCHAR(20) DEFAULT NULL`);
            console.log("Added lastNotifiedDate column to todos table");
        } catch (e) { }

        // [남개발 부장] 대규모 트래픽 대응을 위한 인덱싱 추가 (성능 최적화)
        try { await pool.query(`CREATE INDEX idx_todos_alert ON todos (time, completed, lastNotifiedDate)`); } catch (e) { }
        try { await pool.query(`CREATE INDEX idx_todos_user_routine ON todos (username, scheduleMode, completed)`); } catch (e) { }
        try { await pool.query(`CREATE INDEX idx_push_subs_user ON push_subscriptions (username)`); } catch (e) { }

        try { await pool.query(`ALTER TABLE affirmations ADD COLUMN username VARCHAR(50) DEFAULT 'master'`); } catch (e) { }
        try { await pool.query(`ALTER TABLE users ADD COLUMN name VARCHAR(100) DEFAULT '' AFTER password`); } catch (e) { }
        try { await pool.query(`ALTER TABLE users ADD COLUMN points INT DEFAULT 0`); } catch (e) { }
        try { await pool.query("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT '😊'"); } catch (e) { }

        try {
            await pool.query(`ALTER TABLE affirmations ADD COLUMN username VARCHAR(50) DEFAULT 'master'`);
            console.log("Added username column to affirmations table");
        } catch (e) { /* 이미 존재하면 무시 */ }

        try {
            await pool.query(`ALTER TABLE users ADD COLUMN name VARCHAR(100) DEFAULT '' AFTER password`);
        } catch (e) { /* 이미 존재하면 무시 */ }

        try {
            await pool.query(`ALTER TABLE users ADD COLUMN points INT DEFAULT 0`);
            console.log("Added points column to users table");
        } catch (e) { /* ignore */ }

        // 마스터 계정 확인 및 추가 (id: master, pw: 1234)
        const [users] = await pool.query("SELECT * FROM users WHERE username = 'master'");
        if (users.length === 0) {
            await pool.query("INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)", ['master', '2tobee', Date.now()]);
            console.log("Master account created (master/2tobee)");
        }

        console.log("Database initialized.");
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
                const [todos] = await pool.query("SELECT * FROM todos WHERE username = ?", [user.username]);

                let totalMissions = 0;
                let completedMissions = 0;

                for (const todo of todos) {
                    const scheduledDays = todo.days ? todo.days.split(',') : [];
                    if (scheduledDays.includes(dayStr)) {
                        totalMissions++;
                        if (todo.completed) {
                            completedMissions++;
                        }
                    }
                }

                if (totalMissions > 0) {
                    // [남개발 부장] 검증된 pointCalculator 서비스로 정산 로직 대체
                    const percent = pointCalculator.calculateDailyPoints(todos, dayStr);

                    if (percent > 0) {
                        await pool.query("UPDATE users SET points = points + ? WHERE username = ?", [percent, user.username]);
                        console.log(`[CRON] ${user.username}님 어제(${dayStr}) 미션 정산: ${percent} 포인트 지급 (완료건수: ${completedMissions})`);
                    }
                }


                // 자정 정산 후 처리:
                // 1. '일정(schedule)' 및 '메모(memo)' 모드 유지 (검색 등을 위해 삭제하지 않음)
                // await pool.query("DELETE FROM todos WHERE username = ? AND (scheduleMode = 'schedule' OR scheduleMode = 'memo')", [user.username]);

                // 2. '루틴(routine)' 모드는 완료/실패 상태만 초기화 (다음 날 재빌드)
                await pool.query("UPDATE todos SET completed = false, isFailed = false WHERE username = ? AND scheduleMode = 'routine'", [user.username]);
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

            // 오늘 알람이 울려야 하고, 아직 안 울린 항목 조회
            const [pendingTodos] = await pool.query(
                "SELECT * FROM todos WHERE time = ? AND completed = false AND (lastNotifiedDate IS NULL OR lastNotifiedDate != ?)",
                [currentTime, todayDate]
            );

            for (const todo of pendingTodos) {
                const scheduledDays = todo.days ? todo.days.split(',').map(d => d.trim()) : [];
                if (!scheduledDays.includes(todayStr)) continue;

                // 해당 사용자의 푸시 구독 정보 가져오기
                const [subs] = await pool.query("SELECT subscription FROM push_subscriptions WHERE username = ?", [todo.username]);

                // [남개발 부장] 통합 NotificationService로 병렬 알림 발송 수행
                // allen-steel-concerts-notifications 연동 및 WebPush 통합 처리
                const notificationPayload = {
                    title: 'RoutineCore 알람',
                    body: `${todo.text} 시간입니다!`,
                    icon: '/logo192.png',
                    data: { todoId: todo.id, username: todo.username }
                };

                const broadcastResult = await notificationService.broadcast(subs, notificationPayload);

                // 발송 완료 후 구독 정보 정리 (만료된 것 삭제)
                if (broadcastResult.cleanupNeeded.length > 0) {
                  for (const sub of broadcastResult.cleanupNeeded) {
                      await pool.query("DELETE FROM push_subscriptions WHERE subscription = ?", [sub]);
                  }
                }

                // 발송 완료 표시 (DB 업데이트 - 인덱싱 활용으로 속도 향상)
                await pool.query("UPDATE todos SET lastNotifiedDate = ? WHERE id = ?", [todayDate, todo.id]);
                console.log(`[PUSH] Multi-channel notification sent for ${todo.username}: ${todo.text} (Batch Total: ${broadcastResult.totalSent})`);
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
app.get('/api/todos', async (req, res) => {
    try {
        const username = req.query.username || 'master';
        const [rows] = await pool.query("SELECT * FROM todos WHERE username = ? ORDER BY time ASC", [username]);
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
        await pool.query(
            "INSERT INTO todos (id, text, time, completed, isFailed, days, excludeHolidays, scheduleMode, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [id, text, time, !!completed, !!isFailed, days, !!excludeHolidays, scheduleMode || 'routine', user, Date.now(), lastNotifiedDate || null]
        );
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
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (['text', 'time', 'completed', 'isFailed', 'days', 'excludeHolidays', 'scheduleMode', 'lastNotifiedDate'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(['completed', 'excludeHolidays', 'isFailed'].includes(key) ? !!value : value);
            }
        }

        if (fields.length === 0) return res.json({ success: true, message: "No fields to update" });

        values.push(id);
        const query = `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`;
        await pool.query(query, values);
        console.log(`Updated todo ${id} successfully.`);
        res.json({ success: true });
    } catch (err) {
        console.error("PATCH error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM todos WHERE id = ?", [req.params.id]);
        res.status(204).send();
    } catch (err) {
        console.error("DELETE error:", err.message);
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

// ===== ADMIN (관리자 전용) =====
// 관리자 데이터 내보내기 (Export)
app.get('/api/admin/export', async (req, res) => {
    try {
        console.log(`[ADMIN] Export request Query:`, req.query);
        const { username } = req.query;
        if (!username || username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });

        const [todos] = await pool.query("SELECT * FROM todos");
        const [affirmations] = await pool.query("SELECT * FROM affirmations");
        const [users] = await pool.query("SELECT username, password, name, avatar, points, createdAt FROM users");

        res.json({
            version: "1.0",
            exportDate: new Date().toISOString(),
            data: { todos, affirmations, users }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 관리자 데이터 가져오기 (Import)
app.post('/api/admin/import', async (req, res) => {
    try {
        const { username, importData } = req.body;
        if (!username || username.toLowerCase() !== 'master') return res.status(403).json({ error: "권한이 없습니다." });
        if (!importData || !importData.data) return res.status(400).json({ error: "데이터가 올바르지 않습니다." });

        const { todos, affirmations, users } = importData.data;

        // 트랜잭션 시작
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Todos 복구 (데이터가 있을 때만)
            if (todos && todos.length > 0) {
                await connection.query("DELETE FROM todos");
                for (const todo of todos) {
                    await connection.query(
                        "INSERT INTO todos (id, text, time, completed, days, excludeHolidays, isFailed, scheduleMode, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [todo.id, todo.text, todo.time, todo.completed, todo.days, todo.excludeHolidays, todo.isFailed, todo.scheduleMode, todo.username, todo.createdAt, todo.lastNotifiedDate || null]
                    );
                }
            }

            // 2. Affirmations 복구 (데이터가 있을 때만)
            if (affirmations && affirmations.length > 0) {
                // 특정 타입(긍정확언 또는 뼈때리는말)만 가져올 경우 다른 쪽 데이터가 지워지지 않도록 처리
                const typesInImport = [...new Set(affirmations.map(a => a.type))];
                if (typesInImport.length === 1) {
                    await connection.query("DELETE FROM affirmations WHERE type = ?", [typesInImport[0]]);
                } else {
                    await connection.query("DELETE FROM affirmations");
                }

                for (const aff of affirmations) {
                    await connection.query(
                        "INSERT INTO affirmations (text, type, username, createdAt) VALUES (?, ?, ?, ?)",
                        [aff.text, aff.type || 'positive', aff.username || 'master', aff.createdAt || Date.now()]
                    );
                }
            }

            // 3. Users 복구 (데이터가 있을 때만)
            if (users && users.length > 0) {
                await connection.query("DELETE FROM users");
                for (const user of users) {
                    await connection.query(
                        "INSERT INTO users (username, password, name, avatar, points, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
                        [user.username, user.password, user.name, user.avatar, user.points, user.createdAt]
                    );
                }
            }

            await connection.commit();
            res.json({ success: true, message: "데이터 복구 완료!" });
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
