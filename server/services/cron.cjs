const cron = require('node-cron');
const pool = require('../config/db.cjs');
const pointCalculator = require('../../services/pointCalculator.cjs');
const notificationService = require('../../services/notificationService.cjs');

function setupCronJobs() {
    // 매일 자정 정산
    cron.schedule('0 0 * * *', async () => {
        console.log(`[CRON] 자정 정산 시작 - ${new Date().toISOString()}`);
        try {
            const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const dateStr = yesterdayDate.toISOString().split('T')[0];
            const dayStr = DAYS[yesterdayDate.getDay()];

            const [users] = await pool.query("SELECT username FROM users");
            for (const user of users) {
                // 1. 해당 사용자의 루틴 목록 가져오기
                const [routines] = await pool.query("SELECT * FROM routines WHERE username = ?", [user.username]);
                
                // 2. 어제 날짜의 실제 완료 기록(daily_completions) 가져오기
                const [completions] = await pool.query(
                    "SELECT todo_id FROM daily_completions WHERE username = ? AND date = ?",
                    [user.username, dateStr]
                );
                const completedIds = new Set(completions.map(c => String(c.todo_id)));

                // 3. 루틴 객체에 완료 상태 주입
                const routinesWithStatus = routines.map(r => ({
                    ...r,
                    completed: completedIds.has(String(r.id))
                }));

                let totalMissions = 0;
                let completedCount = 0;

                for (const routine of routinesWithStatus) {
                    const scheduledDays = routine.days ? routine.days.split(',') : [];
                    if (scheduledDays.includes(dayStr)) {
                        totalMissions++;
                        if (routine.completed) completedCount++;
                    }
                }

                if (totalMissions > 0) {
                    const percent = pointCalculator.calculateDailyPoints(routinesWithStatus, dayStr);
                    if (percent > 0) {
                        await pool.query("UPDATE users SET points = points + ? WHERE username = ?", [percent, user.username]);
                    }

                    await pool.query(
                        "INSERT INTO achievement_logs (username, date, total_missions, completed_missions, points_earned, createdAt) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_missions = ?, completed_missions = ?, points_earned = ?",
                        [user.username, dateStr, totalMissions, completedCount, percent, Date.now(), totalMissions, completedCount, percent]
                    );
                }

                // 4. 다음 날을 위해 상태 초기화 (routines 테이블의 completed, isFailed 컬럼은 하위 호환 및 알람용)
                await pool.query("UPDATE routines SET completed = false, isFailed = false WHERE username = ?", [user.username]);
            }
            console.log(`[CRON] 자정 정산 및 데이터 정리 완료`);
        } catch (err) {
            console.error("[CRON] 정산 중 오류 발생:", err.message);
        }
    });

    // 매 분 알람 발송
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
            const todayStr = DAYS[now.getDay()];
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const todayDate = now.toLocaleDateString();

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
                }
            }
        } catch (err) {
            console.error("[PUSH] 알림 발송 에러:", err.message);
        }
    });
}

module.exports = setupCronJobs;
