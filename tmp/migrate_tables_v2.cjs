const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB for migration.");

        // 1. Create new professional tables
        console.log("Creating new tables...");
        
        // Routines Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS routines (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL
            )
        `);

        // Schedules Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS schedules (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                days VARCHAR(100),
                excludeHolidays BOOLEAN DEFAULT FALSE,
                isFailed BOOLEAN DEFAULT FALSE,
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                lastNotifiedDate VARCHAR(20) DEFAULT NULL,
                priority INT DEFAULT 0
            )
        `);

        // Memos Table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS memos (
                id BIGINT PRIMARY KEY,
                text VARCHAR(255) NOT NULL,
                time VARCHAR(10),
                completed BOOLEAN DEFAULT FALSE,
                days VARCHAR(100),
                username VARCHAR(50) DEFAULT 'master',
                createdAt BIGINT,
                category VARCHAR(50) DEFAULT 'general',
                isPinned BOOLEAN DEFAULT FALSE
            )
        `);

        console.log("New tables created successfully.");

        // 2. Data Migration from todos table
        const [oldTodos] = await connection.query("SELECT * FROM todos");
        console.log(`Found ${oldTodos.length} items in legacy todos table.`);

        for (const todo of oldTodos) {
            if (todo.scheduleMode === 'routine') {
                await connection.query(
                    "INSERT IGNORE INTO routines (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [todo.id, todo.text, todo.time, todo.completed, todo.days, todo.excludeHolidays, todo.isFailed, todo.username, todo.createdAt, todo.lastNotifiedDate]
                );
            } else if (todo.scheduleMode === 'schedule') {
                await connection.query(
                    "INSERT IGNORE INTO schedules (id, text, time, completed, days, excludeHolidays, isFailed, username, createdAt, lastNotifiedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [todo.id, todo.text, todo.time, todo.completed, todo.days, todo.excludeHolidays, todo.isFailed, todo.username, todo.createdAt, todo.lastNotifiedDate]
                );
            } else if (todo.scheduleMode === 'memo') {
                await connection.query(
                    "INSERT IGNORE INTO memos (id, text, time, completed, days, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [todo.id, todo.text, todo.time, todo.completed, todo.days, todo.username, todo.createdAt]
                );
            }
        }

        console.log("Migration finished.");

        // 3. Verification
        const [rCount] = await connection.query("SELECT COUNT(*) as cnt FROM routines");
        const [sCount] = await connection.query("SELECT COUNT(*) as cnt FROM schedules");
        const [mCount] = await connection.query("SELECT COUNT(*) as cnt FROM memos");
        
        console.log(`Verification: \n- Routines: ${rCount[0].cnt}\n- Schedules: ${sCount[0].cnt}\n- Memos: ${mCount[0].cnt}`);

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
