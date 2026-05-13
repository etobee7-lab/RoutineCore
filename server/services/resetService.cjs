const pool = require('../config/db.cjs');
const pointCalculator = require('../../services/pointCalculator.cjs');

async function performDailyReset(username, targetDate = null) {
    try {
        const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
        const now = targetDate ? new Date(targetDate) : new Date();
        
        // [남개발 부장] 로컬 시간 기준으로 날짜 문자열 추출 (UTC 오차 방지)
        const offset = now.getTimezoneOffset() * 60000;
        const localNow = new Date(now.getTime() - offset);
        const todayStr = localNow.toISOString().split('T')[0];

        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayLocal = new Date(yesterdayDate.getTime() - offset);
        const yesterdayStr = yesterdayLocal.toISOString().split('T')[0];
        const yesterdayDayStr = DAYS[yesterdayDate.getDay()];

        console.log(`[RESET] Performing smart reset for ${username} - today is ${todayStr}`);

        // 1. 어제 날짜 정산 기록 확인 (포인트 정산 누락 방지)
        const [existingLogs] = await pool.query(
            "SELECT id FROM achievement_logs WHERE username = ? AND date = ?",
            [username, yesterdayStr]
        );

        if (existingLogs.length === 0) {
            console.log(`[RESET] Calculating yesterday's points for ${username} (${yesterdayStr})`);
            const [routines] = await pool.query("SELECT * FROM routines WHERE username = ?", [username]);
            const [completions] = await pool.query(
                "SELECT todo_id FROM daily_completions WHERE username = ? AND date = ?",
                [username, yesterdayStr]
            );
            const completedIds = new Set(completions.map(c => String(c.todo_id)));

            const routinesWithStatus = routines.map(r => ({
                ...r,
                completed: completedIds.has(String(r.id))
            }));

            let totalMissions = 0;
            let completedCount = 0;
            for (const routine of routinesWithStatus) {
                const scheduledDays = routine.days ? routine.days.split(',') : [];
                if (scheduledDays.includes(yesterdayDayStr)) {
                    totalMissions++;
                    if (routine.completed) completedCount++;
                }
            }

            if (totalMissions > 0) {
                const percent = pointCalculator.calculateDailyPoints(routinesWithStatus, yesterdayDayStr);
                if (percent > 0) {
                    await pool.query("UPDATE users SET points = points + ? WHERE username = ?", [percent, username]);
                }
                await pool.query(
                    "INSERT INTO achievement_logs (username, date, total_missions, completed_missions, points_earned, createdAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_missions = ?, completed_missions = ?, points_earned = ?",
                    [username, yesterdayStr, totalMissions, completedCount, percent, Date.now(), totalMissions, completedCount, percent]
                );
            }
        }

        // 2. 오늘의 새로운 시작을 위해 상태 초기화
        await pool.query("UPDATE routines SET completed = false, isFailed = false WHERE username = ?", [username]);
        
        // 3. 마지막 초기화 날짜 업데이트
        await pool.query("UPDATE users SET lastResetDate = ? WHERE username = ?", [todayStr, username]);
        
        console.log(`[RESET] Smart reset completed for ${username}`);
    } catch (err) {
        console.error(`[RESET] Error during reset for ${username}:`, err.message);
    }
}

module.exports = { performDailyReset };
