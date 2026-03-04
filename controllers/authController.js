const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { readDB, writeDB } = require('../models/dbHelper');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper: generate token
const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
    const { fname, lname, email, pass, age, weight, height, gender, goal, exp, activity, budget } = req.body;

    if (!email || !pass || !fname) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pass, salt);

    const newUser = {
        id: Date.now().toString(),
        fname, lname, email,
        pass: hashedPassword,
        age, weight, height, gender, goal, exp, activity,
        budget: budget || '',
        plan: 'free',
        planExpiry: null, // New field for subscription expiry
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
    res.status(201).json({
        message: 'User created successfully',
        user: userWithoutPass,
        token: generateToken(newUser.id)
    });
};

const loginUser = async (req, res) => {
    const { email, pass } = req.body;

    if (!email || !pass) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (user && (await bcrypt.compare(pass, user.pass))) {
        const { pass: _, ...userWithoutPass } = user;
        res.status(200).json({
            message: 'Login successful',
            user: userWithoutPass,
            token: generateToken(user.id)
        });
    } else {
        res.status(401).json({ error: 'Invalid email or password' });
    }
};

const getUserProfile = (req, res) => {
    res.status(200).json({ user: req.user });
};

const updateUserProfile = (req, res) => {
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.id);

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
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile
};
