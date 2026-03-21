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

        // 1. Fetch from the new memos table
        const [memoRows] = await connection.query(
            "SELECT * FROM memos WHERE username = 'master' ORDER BY createdAt DESC"
        );
        
        console.log(`\n--- [1] 마스터 전용 메모 테이블 (Total: ${memoRows.length}건) ---`);
        if (memoRows.length > 0) {
            memoRows.forEach(m => {
                console.log(`- [${m.category}] ${m.text} (${m.days || '상시'})`);
            });
        } else {
            console.log("- 현재 등록된 전용 메모 항목이 없습니다.");
        }

        // 2. Fetch from affirmations (Mental Memos)
        const [affRows] = await connection.query(
            "SELECT type, text FROM affirmations WHERE username = 'master' ORDER BY createdAt DESC"
        );
        
        console.log(`\n--- [2] 정신적 메모 (확언/뼈때리는 말 - Total: ${affRows.length}건) ---`);
        affRows.forEach(a => {
            console.log(`- [${a.type === 'tough' ? '뼈때리는말' : '긍정확언'}] ${a.text}`);
        });

        // 3. Special search in routines for "메모" keyword
        const [keywordMemos] = await connection.query(
            "SELECT time, text FROM routines WHERE username = 'master' AND text LIKE '%메모%'"
        );
        if (keywordMemos.length > 0) {
            console.log(`\n--- [3] 루틴 내 포함된 핵심 메모 키워드 항목 ---`);
            keywordMemos.forEach(k => {
                console.log(`- ${k.time} | ${k.text} (루틴 연동 메모)`);
            });
        }

    } catch (err) {
        console.error("Execution failed:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fetchJustMemos();
