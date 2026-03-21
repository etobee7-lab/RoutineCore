const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function updatePoints() {
    try {
        const pool = mysql.createPool(dbConfig);
        const [result] = await pool.query("UPDATE users SET points = 100 WHERE username = 'master'");
        console.log(`Updated master points: ${result.affectedRows} row(s) updated.`);
        await pool.end();
    } catch (err) {
        console.error("Error updating points:", err.message);
    }
}

updatePoints();
