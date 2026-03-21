const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function execute() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // 1. Handle 'master' users based on todos_final.json (the source of Saturday data)
        const jsonPath = 'c:/RoutineCore/tmp/todos_final.json';
        if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            console.log("Loaded backup data for master.");

            for (const item of jsonData) {
                if (item.username === 'master' && item.days && item.days.includes('토')) {
                    // This item SHOULD have been on Saturday. 
                    // Let's make it available for Sunday too.
                    let newDays = item.days;
                    if (!newDays.includes('일')) {
                        newDays += ',일';
                    }
                    console.log(`Updating master item ${item.id} (${item.text}) to days: ${newDays}`);
                    await connection.query("UPDATE todos SET days = ? WHERE id = ? AND username = 'master'", [newDays, item.id]);
                }
            }
        }

        // 2. Handle 'etobee' users based on current DB (already has some Saturday data)
        const [etobeeRows] = await connection.query("SELECT id, text, days FROM todos WHERE username = 'etobee' AND days LIKE '%토%'");
        console.log(`Found ${etobeeRows.length} Saturday items for etobee in DB.`);

        for (const row of etobeeRows) {
            let newDays = row.days;
            if (!newDays.includes('일')) {
                newDays += ',일';
                console.log(`Updating etobee item ${row.id} (${row.text}) to days: ${newDays}`);
                await connection.query("UPDATE todos SET days = ? WHERE id = ?", [newDays, row.id]);
            }
        }

        console.log("Data update complete.");

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

execute();
