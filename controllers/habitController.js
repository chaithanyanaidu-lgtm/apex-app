const { readDB, writeDB } = require('../models/dbHelper');

const getHabits = (req, res) => {
    const db = readDB();
    const habits = db.habits.filter(h => h.email === req.user.email);
    res.json({ habits });
};

const addHabit = (req, res) => {
    const { name, icon, category } = req.body;
    const email = req.user.email;

    if (!name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    const habit = {
        id: Date.now().toString(),
        email,
        name,
        icon: icon || '✅',
        category: category || 'custom',
        createdAt: new Date().toISOString()
    };

    db.habits.push(habit);
    writeDB(db);
    res.status(201).json({ habit });
};

const deleteHabit = (req, res) => {
    const db = readDB();
    db.habits = db.habits.filter(h => h.id !== req.params.id);
    db.habitLogs = db.habitLogs.filter(l => l.habitId !== req.params.id);
    writeDB(db);
    res.json({ message: 'Habit deleted' });
};

const toggleHabitLog = (req, res) => {
    const { habitId, date } = req.body;
    const email = req.user.email;

    if (!habitId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const logDate = date || new Date().toISOString().split('T')[0];
    const db = readDB();

    const existingIdx = db.habitLogs.findIndex(l => l.email === email && l.habitId === habitId && l.date === logDate);

    if (existingIdx !== -1) {
        db.habitLogs.splice(existingIdx, 1);
        writeDB(db);
        res.json({ completed: false, message: 'Habit unchecked' });
    } else {
        db.habitLogs.push({
            id: Date.now().toString(),
            email,
            habitId,
            date: logDate,
            completedAt: new Date().toISOString()
        });
        writeDB(db);
        res.json({ completed: true, message: 'Habit completed' });
    }
};

const getWeeklyHabitLogs = (req, res) => {
    const db = readDB();
    const weekStart = req.params.weekStart;
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const logs = db.habitLogs.filter(l => l.email === req.user.email && l.date >= weekStart && l.date < weekEnd);
    res.json({ logs });
};

const getAllHabitLogs = (req, res) => {
    const db = readDB();
    const logs = db.habitLogs.filter(l => l.email === req.user.email);
    res.json({ logs });
};

module.exports = { getHabits, addHabit, deleteHabit, toggleHabitLog, getWeeklyHabitLogs, getAllHabitLogs };
