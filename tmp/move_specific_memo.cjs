const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function moveMemo() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // 1. Get the item from routines
        const [rows] = await connection.query("SELECT * FROM routines WHERE text LIKE '%메모 브로치%'");
        if (rows.length > 0) {
            const item = rows[0];
            console.log(`Found item in routines: ${item.text}`);

            // 2. Insert into memos
            await connection.query(
                "INSERT IGNORE INTO memos (id, text, time, completed, days, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [item.id, item.text, item.time, item.completed, item.days, item.username, item.createdAt]
            );

            // 3. Delete from routines
            await connection.query("DELETE FROM routines WHERE id = ?", [item.id]);
            console.log("Successfully moved to memos table.");
        } else {
            console.log("Item not found in routines table.");
        }

    } catch (err) {
        console.error("Move failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

moveMemo();
