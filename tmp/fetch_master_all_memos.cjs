const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchAllMemos() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // 1. Fetch from todos table (memos, schedules)
        const [todoRows] = await connection.query(
            "SELECT * FROM todos WHERE username = 'master' AND scheduleMode IN ('memo', 'schedule') ORDER BY time ASC"
        );
        
        console.log(`\n--- Master Todos (Memos/Schedules) [Count: ${todoRows.length}] ---`);
        todoRows.forEach(t => {
            console.log(`- [${t.scheduleMode}] ${t.time} | ${t.text} (${t.days})`);
        });

        // 2. Fetch from affirmations table
        const [affRows] = await connection.query(
            "SELECT * FROM affirmations WHERE username = 'master' ORDER BY createdAt DESC"
        );
        
        console.log(`\n--- Master Affirmations (긍정 확언/뼈때리는 말) [Count: ${affRows.length}] ---`);
        affRows.forEach(a => {
            console.log(`- [${a.type === 'tough' ? '뼈때리는말' : '긍정확언'}] ${a.text}`);
        });

        // 3. Scan for other scheduleModes
        const [modes] = await connection.query("SELECT DISTINCT scheduleMode FROM todos WHERE username = 'master'");
        console.log(`\nDebug - Available Master ScheduleModes:`, modes.map(m => m.scheduleMode));

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchAllMemos();
