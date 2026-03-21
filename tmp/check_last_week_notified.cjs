const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkLastWeek() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE lastNotifiedDate = '2026. 3. 15.' OR lastNotifiedDate = '2026-03-15' OR lastNotifiedDate LIKE '%03. 15%'");
        console.log(`Todos notified on March 15:`, rows.length);
        rows.forEach(t => console.log(`- [${t.username}] [${t.time}] [${t.scheduleMode}] ${t.text}`));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkLastWeek();
