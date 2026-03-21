const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2tobee!@',
    database: 'todo_db'
};

async function syncMasterData() {
    let connection;
    try {
        const filePath = 'c:/RoutineCore/tmp/todos_final.json';
        const rawData = fs.readFileSync(filePath, 'utf8');
        const todos = JSON.parse(rawData);

        connection = await mysql.createConnection(dbConfig);
        
        console.log(`[DATA-SYNC] 파일에서 ${todos.length}개의 데이터 로드 완료.`);

        // 1. 기존 master 데이터 정리 (이식을 위해 깨끗하게 비우거나 업데이트)
        // 안전을 위해 master 계정의 기존 데이터를 일단 보존하며 병합하거나, 
        // 대표님의 요청(이식)에 따라 정확한 세팅을 위해 교체합니다.
        await connection.query("DELETE FROM todos WHERE username = 'master'");
        console.log("[DATA-SYNC] 기존 master 데이터 정리 완료.");

        // 2. 새로운 데이터 대량 이식 (Bulk Insert 지향)
        const query = `
            INSERT INTO todos 
            (id, text, time, completed, days, excludeHolidays, isFailed, scheduleMode, username, createdAt, lastNotifiedDate) 
            VALUES ?
        `;

        const values = todos.map(t => [
            t.id, 
            t.text, 
            t.time, 
            t.completed ? 1 : 0, 
            t.days || '월,화,수,목,금', 
            t.excludeHolidays ? 1 : 0, 
            t.isFailed ? 1 : 0, 
            t.scheduleMode || 'routine', 
            'master', 
            t.createdAt || Date.now(), 
            t.lastNotifiedDate || null
        ]);

        await connection.query(query, [values]);
        
        console.log(`[DATA-SYNC] 총 ${values.length}개의 루틴/일정 데이터가 이식되었습니다.`);
        console.log("==================================================");
        console.log("   RoutineCore 'master' 계정 이식 성공");
        console.log("==================================================");

    } catch (err) {
        console.error("데이터 이식 도중 오류 발생:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

syncMasterData();
