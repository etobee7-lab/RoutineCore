const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchToday() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE days LIKE '%일%' ORDER BY time ASC");
        
        console.log(`--- [2026-03-22 일요일] 루틴 및 일정 총 ${rows.length}건 ---`);
        
        const users = [...new Set(rows.map(r => r.username))];
        
        for (const user of users) {
            const userRows = rows.filter(r => r.username === user);
            console.log(`\n[User: ${user}] (${userRows.length} items)`);
            userRows.forEach(t => {
                console.log(`- [${t.time}] [${t.scheduleMode}] ${t.text}`);
            });
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchToday();
