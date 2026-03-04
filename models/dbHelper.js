const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({
            users: [],
            payments: [],
            workoutLogs: [],
            mealLogs: [],
            habits: [],
            habitLogs: []
        }, null, 2));
    } else {
        // Ensure new collections exist in existing DB
        const db = readDB();
        let changed = false;
        if (!db.workoutLogs) { db.workoutLogs = []; changed = true; }
        if (!db.mealLogs) { db.mealLogs = []; changed = true; }
        if (!db.habits) { db.habits = []; changed = true; }
        if (!db.habitLogs) { db.habitLogs = []; changed = true; }
        if (changed) writeDB(db);
    }
}

function readDB() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure initDB runs
initDB();

module.exports = {
    readDB,
    writeDB
};
