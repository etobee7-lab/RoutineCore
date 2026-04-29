
const fs = require('fs');
const content = fs.readFileSync('c:/RoutineCore/src/App.jsx', 'utf8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') stack.push({line: i+1});
        if (char === '}') {
            if (stack.length === 0) {
                console.log('Unmatched } at line ' + (i+1));
            } else {
                stack.pop();
            }
        }
    }
}
if (stack.length > 0) {
    console.log('Unmatched { at:');
    stack.forEach(s => console.log('Line ' + s.line));
} else {
    console.log('Braces are balanced');
}
