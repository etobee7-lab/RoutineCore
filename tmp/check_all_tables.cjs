const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function checkTables() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SHOW TABLES");
        console.log("Tables in database:", rows.map(r => Object.values(r)[0]));
        
        for (const row of rows) {
            const tableName = Object.values(row)[0];
            const [cols] = await connection.query(`DESCRIBE ${tableName}`);
            console.log(`\nTable: ${tableName}`);
            cols.forEach(c => console.log(`- ${c.Field} (${c.Type})`));
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkTables();
