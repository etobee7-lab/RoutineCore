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
        console.log("Database connected.");

        // 1. Get Master user data
        const [masterUsers] = await connection.query("SELECT * FROM users WHERE username = 'master'");
        if (masterUsers.length === 0) {
            console.log("Master user not found.");
            return;
        }
        const master = masterUsers[0];

        // 2. Check/Create etobee user
        const [etobeeUsers] = await connection.query("SELECT * FROM users WHERE username = 'etobee'");
        if (etobeeUsers.length === 0) {
            console.log("Creating etobee user...");
            await connection.query(
                "INSERT INTO users (username, password, name, avatar, points, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
                ['etobee', master.password, '이토비', master.avatar, master.points, Date.now()]
            );
        } else {
            console.log("etobee user already exists. Updating profile...");
            await connection.query(
                "UPDATE users SET avatar = ?, points = ? WHERE username = 'etobee'",
                [master.avatar, master.points]
            );
        }

        // 3. Clear existing etobee data (optional, but requested "copy current files")
        await connection.query("DELETE FROM todos WHERE username = 'etobee'");
        await connection.query("DELETE FROM affirmations WHERE username = 'etobee'");

        // 4. Copy Todos
        const [masterTodos] = await connection.query("SELECT * FROM todos WHERE username = 'master'");
        let counter = 0;
        for (const todo of masterTodos) {
            // Ensure unique ID by adding a counter to current timestamp
            const uniqueId = Date.now() + (counter++);
            await connection.query(
                "INSERT INTO todos (id, text, time, completed, days, excludeHolidays, isFailed, scheduleMode, username, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [uniqueId, todo.text, todo.time, todo.completed, todo.days, todo.excludeHolidays, todo.isFailed, todo.scheduleMode, 'etobee', Date.now()]
            );
        }
        console.log(`Copied ${masterTodos.length} todos.`);

        // 5. Copy Affirmations
        const [masterAffs] = await connection.query("SELECT * FROM affirmations WHERE username = 'master'");
        for (const aff of masterAffs) {
            await connection.query(
                "INSERT INTO affirmations (text, type, username, createdAt) VALUES (?, ?, ?, ?)",
                [aff.text, aff.type, 'etobee', Date.now()]
            );
        }
        console.log(`Copied ${masterAffs.length} affirmations.`);

        console.log("Migration completed successfully!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
