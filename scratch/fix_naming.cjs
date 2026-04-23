const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'todo_db'
        });

        console.log('Connecting to DB...');
        
        const [res1] = await pool.query("UPDATE schedules SET text = REPLACE(text, '히브코어', '허브코어')");
        console.log('Schedules updated:', res1.affectedRows);
        
        const [res2] = await pool.query("UPDATE routines SET text = REPLACE(text, '히브코어', '허브코어')");
        console.log('Routines updated:', res2.affectedRows);

        console.log('Fix completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error fixing data:', err.message);
        process.exit(1);
    }
}

fix();
