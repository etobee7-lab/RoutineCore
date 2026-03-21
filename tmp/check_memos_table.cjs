const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkMemos() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // Fetching strictly from the new 'memos' table
        const [rows] = await connection.query("SELECT * FROM memos WHERE username = 'master'");
        
        console.log(`\n--- [신규 메모 전용 테이블] 데이터 조회 결과 (총 ${rows.length}건) ---`);
        if (rows.length > 0) {
            rows.forEach(m => {
                console.log(`- [id: ${m.id}] ${m.text} (카테고리: ${m.category})`);
            });
        } else {
            console.log("\n[알림] 현재 메모 테이블은 '비어 있는 상태(Zero)'입니다.");
            console.log("고도화된 관리를 위해 대표님의 소중한 기록을 받을 모든 준비가 끝났습니다.");
        }

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkMemos();
