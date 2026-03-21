const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkRawDays() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT id, text, days, scheduleMode FROM todos WHERE username = 'master'");
        
        console.log("Master Todos raw days:");
        rows.forEach(t => console.log(`${t.id}: [${t.scheduleMode}] ${t.text} (days: "${t.days}")`));
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkRawDays();
