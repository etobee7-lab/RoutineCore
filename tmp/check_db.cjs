const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function test() {
    try {
        const pool = await mysql.createPool(dbConfig);
        const [rows] = await pool.query("SELECT * FROM affirmations");
        console.log(JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
