const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkAll() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE days LIKE '%토%'");
        console.log(`Total todos with '토':`, rows.length);
        rows.forEach(t => console.log(`${t.id}: [${t.username}] [${t.scheduleMode}] ${t.text} (days: "${t.days}")`));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkAll();
