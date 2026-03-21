const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'rts_db'
};

async function checkRTSTodos() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE username = 'master' AND days LIKE '%일%'");
        console.log(`Todos for master on Sunday in rts_db:`, rows.length);
        rows.forEach(t => console.log(`- [${t.time}] [${t.scheduleMode}] ${t.text}`));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkRTSTodos();
