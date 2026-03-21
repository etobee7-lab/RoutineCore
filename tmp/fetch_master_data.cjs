const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchMasterData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(
            "SELECT id, text, time, days, scheduleMode, completed FROM todos WHERE username = 'master' ORDER BY scheduleMode, time ASC"
        );

        console.log("\n==================================================");
        console.log("   RoutineCore 'master' 계정 데이터 추출 결과");
        console.log("==================================================\n");

        if (rows.length === 0) {
            console.log("등록된 데이터가 없습니다.");
        } else {
            const groups = { routine: [], schedule: [], memo: [] };
            rows.forEach(row => {
                if (groups[row.scheduleMode]) groups[row.scheduleMode].push(row);
                else groups.routine.push(row); // default
            });

            ['routine', 'schedule', 'memo'].forEach(mode => {
                const label = mode === 'routine' ? '🔄 루틴 (Routine)' : mode === 'schedule' ? '📅 일정 (Schedule)' : '📝 메모 (Memo)';
                console.log(`[${label}]`);
                if (groups[mode].length === 0) {
                    console.log("  (없음)");
                } else {
                    groups[mode].forEach(item => {
                        const status = item.completed ? '[완료]' : '[대기]';
                        console.log(`  - ${item.time || '--:--'} | ${item.text} ${status} (${item.days || '매일'})`);
                    });
                }
                console.log("");
            });
        }
        console.log("==================================================\n");

    } catch (err) {
        console.error("데이터 추출 도중 오류 발생:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchMasterData();
