const fs = require('fs');
const jsonData = JSON.parse(fs.readFileSync('c:/RoutineCore/tmp/todos_final.json', 'utf8'));
const memos = jsonData.filter(item => item.scheduleMode === 'memo');
console.log(`Found ${memos.length} memo mode items in JSON.`);
memos.forEach(m => console.log(`- [${m.username}] ${m.time} | ${m.text}`));
