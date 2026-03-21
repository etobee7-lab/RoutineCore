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
        const [rows] = await connection.query("SELECT * FROM todos WHERE scheduleMode IN ('memo', 'schedule')");
        console.log(`Total memos/schedules:`, rows.length);
        rows.forEach(t => console.log(`${t.id}: [${t.username}] [${t.scheduleMode}] ${t.text} (days: "${t.days}")`));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkMemos();
