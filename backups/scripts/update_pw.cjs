const mysql = require('mysql2/promise');

(async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '2tobee!@',
        database: 'todo_db'
    });
    await conn.execute("UPDATE users SET password='2tobee' WHERE username='master'");
    const [rows] = await conn.execute("SELECT username, password FROM users WHERE username='master'");
    console.log('Updated master account:', rows);
    await conn.end();
})();
