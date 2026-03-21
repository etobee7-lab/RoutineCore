const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function portToAllDays() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // Update all routines for 'master'
        const [result] = await connection.query(
            "UPDATE todos SET days = '월,화,수,목,금,토,일' WHERE username = 'master' AND scheduleMode = 'routine'"
        );
        
        console.log(`Successfully updated ${result.affectedRows} routine items to '월~일'.`);

        // Check result
        const [rows] = await connection.query(
            "SELECT time, text, days FROM todos WHERE username = 'master' AND scheduleMode = 'routine' ORDER BY time ASC"
        );
        console.log("\n--- Updated Master Routines ---");
        rows.forEach(t => console.log(`- ${t.time} | ${t.text} (${t.days})`));

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

portToAllDays();
