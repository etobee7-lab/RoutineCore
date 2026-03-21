const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchAllRoutines() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT time, text, username, days FROM todos WHERE scheduleMode = 'routine' ORDER BY time ASC");
        
        console.log(`--- 전체 루틴 명단 (총 ${rows.length}건) ---`);
        
        // Group by user for clarity, but display all
        const users = ['master', 'etobee']; // Focus on main ones first
        
        for (const user of users) {
            const userRows = rows.filter(r => r.username === user);
            console.log(`\n[User: ${user}]`);
            userRows.forEach(t => {
                console.log(`- ${t.time} | ${t.text} (${t.days})`);
            });
        }
        
        // Others
        const otherRows = rows.filter(r => !users.includes(r.username));
        if (otherRows.length > 0) {
            console.log(`\n[기타 사용자]`);
            otherRows.forEach(t => {
                console.log(`- ${t.time} | ${t.text} [${t.username}] (${t.days})`);
            });
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchAllRoutines();
