const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function checkTodos() {
    try {
        const res = await fetch('http://localhost:3000/api/todos?username=master');
        const todos = await res.json();
        const today = new Date().toLocaleDateString();
        const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
        const currentDay = DAYS_OF_WEEK[new Date().getDay()];

        console.log('--- Today is:', today, '(', currentDay, ') ---');
        todos.forEach(t => {
            const days = t.days ? t.days.split(',') : [];
            const isScheduledToday = days.includes(currentDay);
            console.log(`ID: ${t.id}, Text: ${t.text}, Time: ${t.time}, Days: ${t.days}, ScheduledToday: ${isScheduledToday}, Completed: ${t.completed}, Failed: ${t.isFailed}, LastNotifiedDate: ${t.lastNotifiedDate}`);
        });
    } catch (e) {
        console.error(e);
    }
}
checkTodos();
