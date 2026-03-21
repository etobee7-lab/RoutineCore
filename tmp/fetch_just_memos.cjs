const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function fetchJustMemos() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB.");

        // 1. Fetch from affirmations (Mental Memos)
        const [affRows] = await connection.query(
            "SELECT type, text FROM affirmations WHERE username = 'master' ORDER BY createdAt DESC"
        );
        
        console.log(`\n--- [1] 정신적 메모 (확언/뼈때리는 말) [Count: ${affRows.length}] ---`);
        affRows.forEach(a => {
            console.log(`- [${a.type === 'tough' ? '뼈때리는말' : '긍정확언'}] ${a.text}`);
        });

        // 2. Search for keyword "메모" in todos table
        const [todoMemos] = await connection.query(
            "SELECT time, text, scheduleMode FROM todos WHERE username = 'master' AND (text LIKE '%메모%' OR scheduleMode = 'memo')"
        );
        
        if (todoMemos.length > 0) {
            console.log(`\n--- [2] 투두/일정 내 메모 항목 [Count: ${todoMemos.length}] ---`);
            todoMemos.forEach(t => {
                console.log(`- [${t.scheduleMode}] ${t.time} | ${t.text}`);
            });
        } else {
            console.log(`\n--- [2] 투두/일정 내 '메모' 키워드 항목이 없습니다. ---`);
        }

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchJustMemos();
