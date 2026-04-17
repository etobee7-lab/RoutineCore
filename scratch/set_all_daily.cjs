const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function setAllDaily() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        console.log("[UPDATE] etobee 루틴/일정 매일 반복 설정 시작...");

        const [rResult] = await connection.query(
            "UPDATE routines SET days = '월,화,수,목,금,토,일', excludeHolidays = 0 WHERE username = 'etobee'"
        );
        const [sResult] = await connection.query(
            "UPDATE schedules SET days = '월,화,수,목,금,토,일', excludeHolidays = 0 WHERE username = 'etobee'"
        );

        console.log(`[UPDATE] 루틴 ${rResult.affectedRows}건, 일정 ${sResult.affectedRows}건 업데이트 완료.`);

    } catch (err) {
        console.error("Update Failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

setAllDaily();
