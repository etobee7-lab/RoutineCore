const express = require('express');
const router = express.Router();
const pool = require('../config/db.cjs');
const { verifyToken } = require('../middleware/auth.cjs');

// 전체 목록 조회
router.get('/', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;

        // [남개발 부장] 스마트 리셋 엔진 가동! (자정에 컴이 꺼져있어도 접속 시 자동 초기화 🛡️)
        const [userRows] = await pool.query("SELECT lastResetDate FROM users WHERE username = ?", [username]);
        
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const todayStr = new Date(now.getTime() - offset).toISOString().split('T')[0];
        
        if (userRows.length > 0) {
            const lastReset = userRows[0].lastResetDate;
            // DB의 DATE 타입은 JS Date 객체로 올 수 있으므로 변환 처리
            const lastResetStr = lastReset ? (new Date(new Date(lastReset).getTime() - offset).toISOString().split('T')[0]) : null;

            if (lastResetStr !== todayStr) {
                const resetService = require('../services/resetService.cjs');
                await resetService.performDailyReset(username);
            }
        }

        const query = `
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'routine' as scheduleMode, username, createdAt, lastNotifiedDate, NULL as activatedWeek, startDate, endDate FROM routines WHERE LOWER(username) = LOWER(?)
            UNION ALL
            SELECT id, text, time, completed, days, excludeHolidays, isFailed, 'schedule' as scheduleMode, username, createdAt, lastNotifiedDate, activatedWeek, startDate, endDate FROM schedules WHERE LOWER(username) = LOWER(?)
            UNION ALL
            SELECT id, text, time, completed, days, false as excludeHolidays, false as isFailed, 'memo' as scheduleMode, username, createdAt, NULL as lastNotifiedDate, activatedWeek, startDate, endDate FROM memos WHERE LOWER(username) = LOWER(?)
            ORDER BY time ASC
        `;
        const [rows] = await pool.query(query, [username, username, username]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 신규 추가
router.post('/', verifyToken, async (req, res) => {
    try {
        console.log("POST /api/todos incoming:", req.body);
        const { id, text, time, completed, isFailed, days, excludeHolidays, scheduleMode, lastNotifiedDate, startDate, endDate } = req.body;
        const { username } = req.user;
        const mode = scheduleMode || 'routine';

        const getLocalWeekStr = (date) => {
            const d = new Date(date);
            d.setHours(d.getHours() + 9);
            d.setHours(0,0,0,0);
            const day = d.getDay();
            const diff = d.getDate() - (day === 0 ? 6 : day - 1);
            const monday = new Date(d.setDate(diff));
            return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        };
        const currentWeekStr = getLocalWeekStr(new Date());

        let targetTable = 'routines';
        if (mode === 'schedule') targetTable = 'schedules';
        else if (mode === 'memo') targetTable = 'memos';

        if (targetTable === 'memos') {
            await pool.query(
                `INSERT INTO ${targetTable} (id, text, time, completed, days, username, createdAt, startDate, endDate, activatedWeek) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, text, time, !!completed, days, username, Date.now(), startDate || null, endDate || null, currentWeekStr]
            );
        } else {
            await pool.query(
                `INSERT INTO ${targetTable} (id, text, time, completed, isFailed, days, excludeHolidays, username, createdAt, lastNotifiedDate, startDate, endDate, activatedWeek) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, text, time, !!completed, !!isFailed, days, !!excludeHolidays, username, Date.now(), lastNotifiedDate || null, startDate || null, endDate || null, currentWeekStr]
            );
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 수정
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;
        const { scheduleMode } = updates;
        
        // [남개발 부장] 효율적인 업데이트를 위해 대상 테이블 결정
        let tables = [];
        if (scheduleMode) {
            tables = [scheduleMode === 'routine' ? 'routines' : (scheduleMode === 'schedule' ? 'schedules' : 'memos')];
        } else {
            // scheduleMode가 없는 경우 (구 버전 호환용) 전체 테이블 순회
            tables = ['routines', 'schedules', 'memos'];
        }

        const fields = [];
        const values = [];
        
        // 1. 업데이트할 필드 추출
        const updateKeys = Object.keys(updates).filter(k => k !== 'scheduleMode');
        
        if (updateKeys.length === 0) return res.json({ success: true });

        for (const table of tables) {
            try {
                // 2. 해당 테이블에 실제로 해당 ID가 있는지 먼저 확인
                const [exists] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
                if (exists.length === 0) continue;

                // 3. 테이블 스키마에 맞는 필드만 선별
                const [columns] = await pool.query(`SHOW COLUMNS FROM ${table}`);
                const validColumns = columns.map(c => c.Field);
                
                const tableFields = [];
                const tableValues = [];
                
                for (const key of updateKeys) {
                    if (validColumns.includes(key)) {
                        tableFields.push(`${key} = ?`);
                        tableValues.push(['completed', 'excludeHolidays', 'isFailed'].includes(key) ? !!updates[key] : updates[key]);
                    }
                }

                if (tableFields.length > 0) {
                    tableValues.push(id);
                    await pool.query(`UPDATE ${table} SET ${tableFields.join(', ')} WHERE id = ?`, tableValues);
                    
                    // [남개발 부장] 원격 기기 알림 해제 브로드캐스트
                    if (req.body.completed === true) {
                        (async () => {
                            try {
                                const [subs] = await pool.query("SELECT subscription FROM push_subscriptions WHERE username = ?", [req.user.username]);
                                const notificationService = require('../../services/notificationService.cjs');
                                await notificationService.broadcast(subs, { type: 'DISMISS', todoId: id });
                            } catch (e) { console.error('[DISMISS-ERROR]', e.message); }
                        })();
                    }
                    
                    return res.json({ success: true, table });
                }
            } catch (tableErr) {
                console.error(`Error updating table ${table}:`, tableErr.message);
                // 개별 테이블 에러는 무시하고 다음 테이블 시도
            }
        }
        
        res.json({ success: true, message: 'No matching records found to update' });
    } catch (err) {
        console.error("PATCH /api/todos/:id Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 삭제
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query("DELETE FROM routines WHERE id = ?", [id]);
        await pool.query("DELETE FROM schedules WHERE id = ?", [id]);
        await pool.query("DELETE FROM memos WHERE id = ?", [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 주간 일정 활성화
router.post('/activate-weekly', verifyToken, async (req, res) => {
    try {
        const { ids, weekStr } = req.body;
        const { username } = req.user;
        
        if (!ids || !weekStr) return res.status(400).json({ error: "필수 정보 누락" });

        await pool.query("UPDATE schedules SET activatedWeek = NULL WHERE username = ? AND activatedWeek = ?", [username, weekStr]);
        await pool.query("UPDATE memos SET activatedWeek = NULL WHERE username = ? AND activatedWeek = ?", [username, weekStr]);

        if (ids.length > 0) {
            const placeholders = ids.map(() => "?").join(",");
            await pool.query(`UPDATE schedules SET activatedWeek = ? WHERE id IN (${placeholders})`, [weekStr, ...ids]);
            await pool.query(`UPDATE memos SET activatedWeek = ? WHERE id IN (${placeholders})`, [weekStr, ...ids]);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// ===== DAILY COMPLETIONS 라우터 (별도 분리) =====
const completionsRouter = express.Router();

// GET /api/daily-completions - 날짜별 완료 기록 조회
completionsRouter.get('/', verifyToken, async (req, res) => {
    try {
        const { username } = req.user;
        const { startDate, endDate } = req.query;

        let query = "SELECT todo_id, date FROM daily_completions WHERE username = ?";
        const params = [username];

        if (startDate && endDate) {
            query += " AND date BETWEEN ? AND ?";
            params.push(startDate, endDate);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/daily-completions/toggle - 날짜별 완료 토글
completionsRouter.post('/toggle', verifyToken, async (req, res) => {
    // [남개발 팀장] 동시성 예외 및 데이터 정합성 보장을 위한 트랜잭션 커넥션 획득 🛡️
    const connection = await pool.getConnection();
    try {
        const { todo_id, date } = req.body;
        const { username } = req.user;
        if (!todo_id || !date) {
            connection.release();
            return res.status(400).json({ error: "필수 정보 누락" });
        }

        // [남개발 부장] 미래 날짜 성공 처리 방지 (KST 기준 보정)
        const nowKst = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
        const todayStr = nowKst.toISOString().split('T')[0];
        
        if (date > todayStr) {
            console.log(`[REJECT] Future date attempt: target=${date}, server_today(KST)=${todayStr}`);
            connection.release();
            return res.status(400).json({ error: "미래 날짜는 미리 성공 처리할 수 없습니다." });
        }

        // 트랜잭션 시작 및 비관적 락(FOR UPDATE)을 위한 대기 처리
        await connection.beginTransaction();

        const [existing] = await connection.query(
            "SELECT * FROM daily_completions WHERE todo_id = ? AND date = ? FOR UPDATE",
            [todo_id, date]
        );

        const isToday = (date === todayStr);
        let newStatus = false;

        if (existing.length > 0) {
            await connection.query(
                "DELETE FROM daily_completions WHERE todo_id = ? AND date = ?",
                [todo_id, date]
            );
            newStatus = false;
        } else {
            await connection.query(
                "INSERT INTO daily_completions (todo_id, date, username, createdAt) VALUES (?, ?, ?, ?)",
                [todo_id, date, username, Date.now()]
            );
            newStatus = true;
        }

        // [남개발 부장] 오늘 날짜인 경우 실시간 상태 반영을 위해 routines/schedules 테이블의 completed 컬럼도 동기화
        if (isToday) {
            const tables = ['routines', 'schedules'];
            for (const table of tables) {
                await connection.query(`UPDATE ${table} SET completed = ? WHERE id = ? AND username = ?`, [newStatus, todo_id, username]);
            }
        }

        // 모든 상태 일치 확인 후 일괄 커밋 실행 ✅
        await connection.commit();
        connection.release();

        res.json({ success: true, completed: newStatus });

        // [남개발 부장] 원격 기기의 알림 해제를 위해 브로드캐스트 전송 (비동기 처리) 📡
        if (newStatus) {
            (async () => {
                try {
                    const [subs] = await pool.query("SELECT subscription FROM push_subscriptions WHERE username = ?", [username]);
                    const dismissPayload = {
                        type: 'DISMISS',
                        todoId: todo_id
                    };
                    const notificationService = require('../../services/notificationService.cjs');
                    await notificationService.broadcast(subs, dismissPayload);
                } catch (e) {
                    console.error('[DISMISS-ERROR]', e.message);
                }
            })();
        }
    } catch (err) {
        // 오류 발생 시 원자적 롤백 수행 🔄
        try {
            await connection.rollback();
        } catch (rollbackErr) {
            console.error('[ROLLBACK-ERROR]', rollbackErr.message);
        }
        connection.release();
        console.error("POST /api/daily-completions/toggle Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports.completionsRouter = completionsRouter;

