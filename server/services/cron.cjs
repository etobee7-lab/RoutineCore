const cron = require('node-cron');
const pool = require('../config/db.cjs');
const pointCalculator = require('../../services/pointCalculator.cjs');
const notificationService = require('../../services/notificationService.cjs');

function setupCronJobs() {
    // 매일 자정 정산
    cron.schedule('0 0 * * *', async () => {
        console.log(`[CRON] 자정 정산 시작 - ${new Date().toISOString()}`);
        try {
            const resetService = require('./resetService.cjs');
            const [users] = await pool.query("SELECT username FROM users");
            for (const user of users) {
                await resetService.performDailyReset(user.username);
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
            const offset = now.getTimezoneOffset() * 60000;
            const todayDate = new Date(now.getTime() - offset).toISOString().split('T')[0];

            const tables = ['routines', 'schedules'];
            for (const tableName of tables) {
                const [pendingItems] = await pool.query(
                    `SELECT * FROM ${tableName} WHERE time = ? AND completed = false AND (lastNotifiedDate IS NULL OR lastNotifiedDate != ?)`,
                    [currentTime, todayDate]
                );

                for (const item of pendingItems) {
                    const scheduledDays = item.days ? item.days.split(',').map(d => d.trim()) : [];
                    if (!scheduledDays.includes(todayStr)) continue;

                    // [남개발 팀장] 공휴일 제외(excludeHolidays) 옵션이 켜져 있고 오늘이 공휴일/대체공휴일/주말인 경우 발송 생략 🚫
                    if (Number(item.excludeHolidays) === 1) {
                        const holidayService = require('./holidayService.cjs');
                        if (holidayService.isKoreanHoliday(todayDate)) {
                            console.log(`[PUSH_SKIP] Skipping holiday for "${item.text}" (Date: ${todayDate})`);
                            continue;
                        }
                    }

                    const [subs] = await pool.query("SELECT subscription FROM push_subscriptions WHERE username = ?", [item.username]);
                    const notificationPayload = {
                        title: `RoutineCore ${tableName === 'routines' ? '루틴' : '일정'} 알람`,
                        body: `${item.text} 시간입니다!`,
                        icon: '/logo192.png',
                        data: { todoId: item.id, username: item.username, type: tableName, date: todayDate }
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
