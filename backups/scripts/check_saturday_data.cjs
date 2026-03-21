const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM todos WHERE username = 'master'");
        
        console.log("Total todos for master:", rows.length);
        
        const saturdayTodos = rows.filter(r => r.days && r.days.includes('토'));
        const sundayTodos = rows.filter(r => r.days && r.days.includes('일'));
        
        console.log("\nSaturday Todos ('토'):", saturdayTodos.length);
        saturdayTodos.forEach(t => console.log(`- [${t.scheduleMode}] ${t.text} (${t.time}) days: ${t.days}`));
        
        console.log("\nSunday Todos ('일'):", sundayTodos.length);
        sundayTodos.forEach(t => console.log(`- [${t.scheduleMode}] ${t.text} (${t.time}) days: ${t.days}`));
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
