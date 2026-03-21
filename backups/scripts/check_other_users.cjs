const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkUserData(user) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT id, text, days, scheduleMode FROM todos WHERE username = ?", [user]);
        console.log(`Todos for ${user}:`, rows.length);
        rows.forEach(t => {
            if (t.days && (t.days.includes('토') || t.days.includes('일'))) {
                console.log(`${t.id}: [${t.scheduleMode}] ${t.text} (days: "${t.days}")`);
            }
        });
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

async function run() {
    console.log("Checking janganet...");
    await checkUserData('janganet');
    console.log("\nChecking test...");
    await checkUserData('test');
    console.log("\nChecking jsgood2002...");
    await checkUserData('jsgood2002');
}

run();
