const { readDB, writeDB } = require('../models/dbHelper');

const logWorkout = (req, res) => {
    // req.user from authMiddleware
    const { day, name, tag, exercises, date } = req.body;
    const email = req.user.email;

    if (!day) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    const logDate = date || new Date().toISOString().split('T')[0];

    const existing = db.workoutLogs.findIndex(l => l.email === email && l.date === logDate && l.day === day);
    if (existing !== -1) {
        db.workoutLogs[existing] = { ...db.workoutLogs[existing], name, tag, exercises, completedAt: new Date().toISOString() };
    } else {
        db.workoutLogs.push({
            id: Date.now().toString(),
            email, day, name, tag,
            exercises: exercises || [],
            date: logDate,
            completed: true,
            completedAt: new Date().toISOString()
        });
    }

    writeDB(db);
    res.status(201).json({ message: 'Workout logged' });
};

const getWorkoutLogs = (req, res) => {
    const db = readDB();
    const logs = db.workoutLogs.filter(l => l.email === req.user.email);
    res.json({ logs });
};

const getWeeklyLogs = (req, res) => {
    const db = readDB();
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];

    const logs = db.workoutLogs.filter(l => l.email === req.user.email && l.date >= weekStart);
    res.json({ logs });
};

module.exports = { logWorkout, getWorkoutLogs, getWeeklyLogs };
