const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function syncToEtobee() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        console.log("[SYNC] master -> etobee 데이터 이식 시작...");

        // 1. etobee 기존 데이터 초기화 (중복 방지)
        await connection.query("DELETE FROM routines WHERE username = 'etobee'");
        await connection.query("DELETE FROM schedules WHERE username = 'etobee'");
        console.log("[SYNC] etobee 기존 데이터 정리 완료.");

        // 2. routines 복정 (id는 고유해야 하므로, 동일 ID를 유지할지 새로 생성할지 결정 필요)
        // 여기서는 데이터의 일관성을 위해 master의 ID를 그대로 사용하되, username만 바꿈.
        // (Table ID가 PK이므로 중복되면 안 되지만, username이 다르면 ID가 달라야 할 수도 있음)
        // 하지만 기존 구조상 ID가 BIGINT PK이므로, 동일 ID를 두 명의 유저가 쓸 수 없습니다.
        // 따라서 새 ID를 부여하거나, 기존 ID를 기반으로 오프셋을 줘야 합니다.
        // 여기서는 Date.now() 기반 ID 생성을 흉내내어 새로 삽입하겠습니다.

        const [masterRoutines] = await connection.query("SELECT * FROM routines WHERE username = 'master'");
        for (const r of masterRoutines) {
            const newId = r.id + 1; // 단순 가산 (충돌 방지용) - 실제로는 Date.now() + index 권장
            await connection.query(
                "INSERT INTO routines (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [Date.now() + Math.floor(Math.random() * 100000), r.text, r.time, r.completed, r.days, r.excludeHolidays, r.isFailed, 'etobee', Date.now(), null]
            );
        }

        const [masterSchedules] = await connection.query("SELECT * FROM schedules WHERE username = 'master'");
        for (const s of masterSchedules) {
            await connection.query(
                "INSERT INTO schedules (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [Date.now() + Math.floor(Math.random() * 100000), s.text, s.time, s.completed, s.days, s.excludeHolidays, s.isFailed, 'etobee', Date.now(), null]
            );
        }

        console.log(`[SYNC] 성공: 루틴 ${masterRoutines.length}건, 일정 ${masterSchedules.length}건이 etobee 계정으로 이식되었습니다.`);

    } catch (err) {
        console.error("Sync Failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

syncToEtobee();
