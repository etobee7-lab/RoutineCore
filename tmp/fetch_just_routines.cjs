const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchJustRoutines() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // Fetch specifically from the new routines table
        const [rows] = await connection.query(
            "SELECT time, text, days FROM routines WHERE username = 'master' ORDER BY time ASC"
        );
        
        console.log(`\n--- [마스터 전문 루틴 테이블] 추출 보고 (총 ${rows.length}건) ---`);
        rows.forEach(r => {
            console.log(`- ${r.time} | ${r.text} (${r.days})`);
        });

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchJustRoutines();
