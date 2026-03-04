const { readDB, writeDB } = require('../models/dbHelper');

const logMeal = (req, res) => {
    const { mealName, calories, protein, carbs, fats, fibre, date } = req.body;
    const email = req.user.email;

    if (!mealName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    db.mealLogs.push({
        id: Date.now().toString(),
        email, mealName,
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fats: fats || 0,
        fibre: fibre || 0,
        date: date || new Date().toISOString().split('T')[0],
        loggedAt: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json({ message: 'Meal logged' });
};

const getMealLogs = (req, res) => {
    const db = readDB();
    const date = req.params.date;
    const logs = db.mealLogs.filter(l => l.email === req.user.email && l.date === date);

    // Calculate totals
    const totals = logs.reduce((acc, l) => ({
        calories: acc.calories + (l.calories || 0),
        protein: acc.protein + (l.protein || 0),
        carbs: acc.carbs + (l.carbs || 0),
        fats: acc.fats + (l.fats || 0),
        fibre: acc.fibre + (l.fibre || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 });

    res.json({ logs, totals });
};

const deleteMealLog = (req, res) => {
    const db = readDB();
    db.mealLogs = db.mealLogs.filter(l => l.id !== req.params.id);
    writeDB(db);
    res.json({ message: 'Meal log deleted' });
};

module.exports = { logMeal, getMealLogs, deleteMealLog };
