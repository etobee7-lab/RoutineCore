const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function portMemosToAllDays() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // Update all schedules and memos for 'master'
        const [result] = await connection.query(
            "UPDATE todos SET days = '월,화,수,목,금,토,일' WHERE username = 'master' AND scheduleMode IN ('schedule', 'memo')"
        );
        
        console.log(`Successfully updated ${result.affectedRows} schedule/memo items to '월~일'.`);

        // Check result
        const [rows] = await connection.query(
            "SELECT time, text, scheduleMode, days FROM todos WHERE username = 'master' AND scheduleMode IN ('schedule', 'memo') ORDER BY time ASC"
        );
        console.log("\n--- Updated Master Schedules/Memos ---");
        rows.forEach(t => console.log(`- [${t.scheduleMode}] ${t.time} | ${t.text} (${t.days})`));

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

portMemosToAllDays();
