const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function updateMasterDays() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // master 계정의 모든 루틴/일정의 요일을 '월,화,수,목,금'으로 일괄 변경
        const [result] = await connection.query(
            "UPDATE todos SET days = '월,화,수,목,금' WHERE username = 'master'"
        );

        console.log(`[DATA-UPDATE] 총 ${result.affectedRows}개의 루틴/일정 요일이 '월,화,수,목,금'으로 업데이트되었습니다.`);
        console.log("==================================================");
        console.log("   RoutineCore 'master' 평일 집중 모드 설정 완료");
        console.log("==================================================");

    } catch (err) {
        console.error("데이터 업데이트 도중 오류 발생:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateMasterDays();
