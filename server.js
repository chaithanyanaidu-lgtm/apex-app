const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ── Gemini API Key (replace with your actual key) ──
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ══════════════════════════════════════
//  DATABASE HELPERS
// ══════════════════════════════════════

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
initDB();

function readDB() {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Helper: get today's date string YYYY-MM-DD
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// Helper: get ISO week start (Monday) for a given date
function getWeekStart(dateStr) {
    const d = new Date(dateStr || Date.now());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// 1. Signup
app.post('/api/signup', (req, res) => {
    const { fname, lname, email, pass, age, weight, height, gender, goal, exp, activity, budget } = req.body;

    if (!email || !pass || !fname) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
        id: Date.now().toString(),
        fname, lname, email, pass, age, weight, height, gender, goal, exp, activity,
        budget: budget || '',
        plan: 'free',
        profileComplete: true,
        createdAt: new Date().toISOString()
    };

    db.users.push(newUser);

    // Create default habits for new user
    const defaultHabits = [
        { id: Date.now() + '-h1', email, name: 'Morning Workout', icon: '🏋️', category: 'fitness', createdAt: new Date().toISOString() },
        { id: Date.now() + '-h2', email, name: 'Breakfast', icon: '🍳', category: 'meals', createdAt: new Date().toISOString() },
        { id: Date.now() + '-h3', email, name: 'Lunch', icon: '🍱', category: 'meals', createdAt: new Date().toISOString() },
        { id: Date.now() + '-h4', email, name: 'Dinner', icon: '🍽️', category: 'meals', createdAt: new Date().toISOString() },
        { id: Date.now() + '-h5', email, name: 'Water Intake (8 glasses)', icon: '💧', category: 'health', createdAt: new Date().toISOString() },
        { id: Date.now() + '-h6', email, name: 'Sleep 7+ Hours', icon: '😴', category: 'health', createdAt: new Date().toISOString() }
    ];
    db.habits.push(...defaultHabits);

    writeDB(db);

    const { pass: _, ...userWithoutPass } = newUser;
    res.status(201).json({ message: 'User created successfully', user: userWithoutPass });
});

// 2. Login
app.post('/api/login', (req, res) => {
    const { email, pass } = req.body;

    if (!email || !pass) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const db = readDB();
    const user = db.users.find(u => u.email === email && u.pass === pass);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { pass: _, ...userWithoutPass } = user;
    res.status(200).json({ message: 'Login successful', user: userWithoutPass });
});

// 3. Payment
app.post('/api/payment', (req, res) => {
    const { email, name, ref, plan, amount } = req.body;

    if (!email || !name || !ref) {
        return res.status(400).json({ error: 'Missing required payment details' });
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const newPayment = {
        id: Date.now().toString(),
        email, name, ref, plan, amount,
        date: new Date().toISOString(),
        status: 'pending'
    };

    db.payments.push(newPayment);
    db.users[userIndex].plan = plan;
    writeDB(db);

    res.status(201).json({ message: 'Payment recorded successfully', payment: newPayment });
});

// 4. Get User data
app.get('/api/user/:email', (req, res) => {
    const email = req.params.email;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { pass: _, ...userWithoutPass } = user;
    res.status(200).json({ user: userWithoutPass });
});

// 5. Update User profile
app.put('/api/user/:email', (req, res) => {
    const email = req.params.email;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const allowed = ['fname', 'lname', 'age', 'weight', 'height', 'gender', 'goal', 'exp', 'activity', 'budget', 'profileComplete'];
    allowed.forEach(key => {
        if (req.body[key] !== undefined) {
            db.users[userIndex][key] = req.body[key];
        }
    });

    writeDB(db);
    const { pass: _, ...userWithoutPass } = db.users[userIndex];
    res.status(200).json({ user: userWithoutPass });
});

// ══════════════════════════════════════
//  WORKOUT LOG ROUTES
// ══════════════════════════════════════

// Log a completed workout
app.post('/api/workout/log', (req, res) => {
    const { email, day, name, tag, exercises, date } = req.body;

    if (!email || !day) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    const logDate = date || todayStr();

    // Check if already logged for this day + date
    const existing = db.workoutLogs.findIndex(l => l.email === email && l.date === logDate && l.day === day);
    if (existing !== -1) {
        // Update existing log
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
});

// Get workout logs for a user
app.get('/api/workout/logs/:email', (req, res) => {
    const db = readDB();
    const logs = db.workoutLogs.filter(l => l.email === req.params.email);
    res.json({ logs });
});

// Get workout logs for current week
app.get('/api/workout/logs/:email/week', (req, res) => {
    const db = readDB();
    const weekStart = getWeekStart();
    const logs = db.workoutLogs.filter(l => l.email === req.params.email && l.date >= weekStart);
    res.json({ logs });
});

// ══════════════════════════════════════
//  MEAL LOG ROUTES
// ══════════════════════════════════════

// Log a meal
app.post('/api/meal/log', (req, res) => {
    const { email, mealName, calories, protein, carbs, fats, fibre, date } = req.body;

    if (!email || !mealName) {
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
        date: date || todayStr(),
        loggedAt: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json({ message: 'Meal logged' });
});

// Get meal logs for a user on a specific date
app.get('/api/meal/logs/:email/:date', (req, res) => {
    const db = readDB();
    const logs = db.mealLogs.filter(l => l.email === req.params.email && l.date === req.params.date);
    const totals = logs.reduce((acc, l) => ({
        calories: acc.calories + (l.calories || 0),
        protein: acc.protein + (l.protein || 0),
        carbs: acc.carbs + (l.carbs || 0),
        fats: acc.fats + (l.fats || 0),
        fibre: acc.fibre + (l.fibre || 0)
    }), { calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 });

    res.json({ logs, totals });
});

// Delete a meal log
app.delete('/api/meal/log/:id', (req, res) => {
    const db = readDB();
    db.mealLogs = db.mealLogs.filter(l => l.id !== req.params.id);
    writeDB(db);
    res.json({ message: 'Meal log deleted' });
});

// ══════════════════════════════════════
//  HABIT ROUTES
// ══════════════════════════════════════

// Get habits for a user
app.get('/api/habits/:email', (req, res) => {
    const db = readDB();
    const habits = db.habits.filter(h => h.email === req.params.email);
    res.json({ habits });
});

// Add a custom habit
app.post('/api/habit', (req, res) => {
    const { email, name, icon, category } = req.body;

    if (!email || !name) {
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
});

// Delete a habit
app.delete('/api/habit/:id', (req, res) => {
    const db = readDB();
    db.habits = db.habits.filter(h => h.id !== req.params.id);
    db.habitLogs = db.habitLogs.filter(l => l.habitId !== req.params.id);
    writeDB(db);
    res.json({ message: 'Habit deleted' });
});

// ══════════════════════════════════════
//  HABIT LOG ROUTES
// ══════════════════════════════════════

// Toggle habit completion for a date
app.post('/api/habit/log', (req, res) => {
    const { email, habitId, date } = req.body;

    if (!email || !habitId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const logDate = date || todayStr();
    const db = readDB();

    const existingIdx = db.habitLogs.findIndex(l => l.email === email && l.habitId === habitId && l.date === logDate);

    if (existingIdx !== -1) {
        // Toggle: remove if already exists
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
});

// Get habit logs for a user for a week
app.get('/api/habit/logs/:email/:weekStart', (req, res) => {
    const db = readDB();
    const weekStart = req.params.weekStart;
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const logs = db.habitLogs.filter(l => l.email === req.params.email && l.date >= weekStart && l.date < weekEnd);
    res.json({ logs });
});

// Get all habit logs for a user (for streak calculation)
app.get('/api/habit/logs/:email', (req, res) => {
    const db = readDB();
    const logs = db.habitLogs.filter(l => l.email === req.params.email);
    res.json({ logs });
});

// ══════════════════════════════════════
//  GEMINI AI CHATBOT PROXY
// ══════════════════════════════════════

app.post('/api/gemini', async (req, res) => {
    const { message, userContext } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(500).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.' });
    }

    const systemPrompt = `You are APEX AI, a fitness assistant chatbot for the APEX fitness app. You help users with:
- Fitness queries, exercise explanations, workout suggestions
- Diet and nutrition advice
- Habit tracking commands
- You understand both English and Telugu (తెలుగు)

User context: ${JSON.stringify(userContext || {})}

IMPORTANT: If the user sends a command to mark a habit or meal as completed, respond with a JSON action block like:
{"action": "mark_habit", "habit": "Breakfast"} or {"action": "log_meal", "meal": "Breakfast", "calories": 400, "protein": 20}

Always be encouraging, friendly, and knowledgeable. Keep responses concise but helpful.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + '\n\nUser message: ' + message }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API error:', err);
            return res.status(500).json({ error: 'Failed to get AI response' });
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

        // Check if there's an action embedded in the response
        let action = null;
        const actionMatch = aiText.match(/\{"action":\s*"[^"]+"/);
        if (actionMatch) {
            try {
                const jsonStart = aiText.indexOf('{');
                const jsonEnd = aiText.lastIndexOf('}') + 1;
                action = JSON.parse(aiText.substring(jsonStart, jsonEnd));
            } catch (e) { /* ignore parse errors */ }
        }

        res.json({ reply: aiText, action });
    } catch (err) {
        console.error('Gemini proxy error:', err);
        res.status(500).json({ error: 'Failed to connect to AI service' });
    }
});

// ══════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    // Hardcoded admin credentials for simplicity as requested
    if (email === 'admin@apex.com' && password === 'admin123') {
        res.status(200).json({ message: 'Admin login successful', token: 'admin-secret-token' });
    } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
    }
});

// Admin Stats
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

// Admin Users List
app.get('/api/admin/users', (req, res) => {
    const db = readDB();
    const users = db.users.map(u => {
        const { pass, ...safeUser } = u;
        return safeUser;
    });
    res.json({ users });
});

// Admin Delete User
app.delete('/api/admin/user/:email', (req, res) => {
    const db = readDB();
    const emailToDelete = req.params.email;

    // Prevent deleting the admin account if it exists in DB
    if (emailToDelete === 'admin@apex.com') {
        return res.status(403).json({ error: 'Cannot delete superadmin' });
    }

    const initialLen = db.users.length;
    db.users = db.users.filter(u => u.email !== emailToDelete);

    if (db.users.length === initialLen) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Cascade delete user data
    db.workoutLogs = db.workoutLogs.filter(l => l.email !== emailToDelete);
    db.mealLogs = db.mealLogs.filter(l => l.email !== emailToDelete);
    db.habits = db.habits.filter(h => h.email !== emailToDelete);
    db.habitLogs = db.habitLogs.filter(l => l.email !== emailToDelete);
    db.payments = db.payments.filter(p => p.email !== emailToDelete);

    writeDB(db);
    res.json({ message: 'User and associated data deleted' });
});
//  STATIC FILE SERVING
// ══════════════════════════════════════

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'apex-pro.html'));
});

app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'apex-pro.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
