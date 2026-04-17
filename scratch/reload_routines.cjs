const mysql = require('mysql2/promise');
const fs = require('fs');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function reloadRoutines() {
    let connection;
    try {
        const filePath = 'c:/RoutineCore/tmp/todos_final.json';
        if (!fs.existsSync(filePath)) {
            console.error(`Error: ${filePath} not found.`);
            return;
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const todos = JSON.parse(rawData);

        connection = await mysql.createConnection(dbConfig);
        
        console.log(`[RELOAD] ${todos.length} items loaded from JSON.`);

        // 1. Clear existing data for master
        await connection.query("DELETE FROM routines WHERE username = 'master'");
        await connection.query("DELETE FROM schedules WHERE username = 'master'");
        console.log("[RELOAD] Existing master routines/schedules cleared.");

        // 2. Classify and Insert
        let routineCount = 0;
        let scheduleCount = 0;

        for (const t of todos) {
            const mode = t.scheduleMode || 'routine';
            const targetTable = mode === 'schedule' ? 'schedules' : 'routines';
            
            const query = `
                INSERT INTO ${targetTable} 
                (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                t.id,
                t.text,
                t.time,
                t.completed ? 1 : 0,
                t.days || '월,화,수,목,금,토,일',
                t.excludeHolidays ? 1 : 0,
                t.isFailed ? 1 : 0,
                'master',
                t.createdAt || Date.now(),
                t.lastNotifiedDate || null
            ];

            await connection.query(query, values);
            if (mode === 'schedule') scheduleCount++; else routineCount++;
        }

        console.log(`[RELOAD] Success: ${routineCount} routines and ${scheduleCount} schedules imported to 'master'.`);
    } catch (err) {
        console.error("Reload Failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

reloadRoutines();
