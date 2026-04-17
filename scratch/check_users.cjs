const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkUsers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [owners] = await connection.query("SELECT DISTINCT username FROM routines");
        const [users] = await connection.query("SELECT username, name FROM users");
        
        console.log("--- Routine Owners ---");
        owners.forEach(o => console.log(o.username));
        
        console.log("--- Registered Users ---");
        users.forEach(u => console.log(`${u.username} (${u.name})`));
    } catch (err) {
        console.error(err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkUsers();
