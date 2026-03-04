const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Route files
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const mealRoutes = require('./routes/mealRoutes');
const habitRoutes = require('./routes/habitRoutes');
const geminiRoutes = require('./routes/geminiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/habit', habitRoutes); // habit routes handle both habit and habit/log inside the router logic setup
app.use('/api/gemini', geminiRoutes);

// Admin Routes (Kept simple as requested previously, but separated)
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@apex.com' && password === 'admin123') {
        res.status(200).json({ message: 'Admin login successful', token: 'admin-secret-token' });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

const { readDB, writeDB } = require('./models/dbHelper');
app.get('/api/admin/stats', (req, res) => {
    const db = readDB();
    const stats = {
        totalUsers: db.users.length,
        totalWorkouts: db.workoutLogs.length,
        totalMeals: db.mealLogs.length,
        activeHabits: db.habits.length
    };
    res.json(stats);
});

app.get('/api/admin/users', (req, res) => {
    const db = readDB();
    const users = db.users.map(u => {
        const { pass, ...safeUser } = u;
        return safeUser;
    });
    res.json({ users });
});

app.delete('/api/admin/user/:email', (req, res) => {
    const db = readDB();
    const emailToDelete = req.params.email;

    if (emailToDelete === 'admin@apex.com') {
        return res.status(403).json({ error: 'Cannot delete superadmin' });
    }

    const initialLen = db.users.length;
    db.users = db.users.filter(u => u.email !== emailToDelete);

    if (db.users.length === initialLen) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.workoutLogs = db.workoutLogs.filter(l => l.email !== emailToDelete);
    db.mealLogs = db.mealLogs.filter(l => l.email !== emailToDelete);
    db.habits = db.habits.filter(h => h.email !== emailToDelete);
    db.habitLogs = db.habitLogs.filter(l => l.email !== emailToDelete);
    db.payments = db.payments.filter(p => p.email !== emailToDelete);

    writeDB(db);
    res.json({ message: 'User and associated data deleted' });
});

// Front-end Fallback Routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'apex-pro.html'));
});

// Since the front-end has multiple html files or handles its own view routing, let's allow all paths not matched by api to serve the main HTML just in case
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'apex-pro.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
