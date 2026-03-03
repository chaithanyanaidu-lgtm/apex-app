const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Initialize simple JSON database
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], payments: [] }, null, 2));
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

// Routes
// 1. Signup
app.post('/api/signup', (req, res) => {
    const { fname, lname, email, pass, age, weight, height, gender, goal, exp, activity } = req.body;

    if (!email || !pass || !fname) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
        id: Date.now().toString(),
        fname, lname, email, pass, age, weight, height, gender, goal, exp, activity, plan: 'free'
    };

    db.users.push(newUser);
    writeDB(db);

    // Don't send password back in response
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

    // Don't send password back in response
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
        status: 'pending' // You might want to simulate processing later
    };

    db.payments.push(newPayment);

    // Update user plan immediately for demonstration (in real life, this happens after verification)
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


// Fallback route to serve the main HTML file
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'apex-pro.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
