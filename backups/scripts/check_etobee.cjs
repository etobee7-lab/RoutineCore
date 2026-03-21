const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkEtobee() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE username = 'etobee'");
        console.log(`Total todos for etobee:`, rows.length);
        rows.forEach(t => console.log(`${t.id}: [${t.scheduleMode}] ${t.text} (days: "${t.days}")`));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkEtobee();
