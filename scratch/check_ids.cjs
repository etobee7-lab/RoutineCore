const pool = require('../server/config/db.cjs');

async function check() {
    try {
        const [schedules] = await pool.query("SELECT id, text FROM schedules WHERE username = 'etobee'");
        const [routines] = await pool.query("SELECT id, text FROM routines WHERE username = 'etobee'");
        
        const scheduleIds = new Set(schedules.map(s => String(s.id)));
        const collisions = routines.filter(r => scheduleIds.has(String(r.id)));
        
        if (collisions.length > 0) {
            console.log("COLLISIONS FOUND:");
            collisions.forEach(r => {
                const sMatch = schedules.find(s => String(s.id) === String(r.id));
                console.log(`ID ${r.id}: Routine('${r.text}') <-> Schedule('${sMatch.text}')`);
            });
        } else {
            console.log("No ID collisions found between tables.");
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
