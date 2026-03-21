const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkCreatedOnSaturday() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Saturday, March 21, 2026 (KST)
        // 2026-03-21 00:00:00 KST = 1772377200000
        // 2026-03-21 23:59:59 KST = 1772463599999
        
        const start = new Date('2026-03-21T00:00:00+09:00').getTime();
        const end = new Date('2026-03-21T23:59:59+09:00').getTime();
        
        const [rows] = await connection.query("SELECT * FROM todos WHERE createdAt >= ? AND createdAt <= ?", [start, end]);
        
        console.log(`Todos created on Saturday (March 21):`, rows.length);
        rows.forEach(t => {
            console.log(`${t.id}: [${t.scheduleMode}] ${t.text} (Created: ${new Date(t.createdAt).toLocaleString()})`);
        });
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkCreatedOnSaturday();
