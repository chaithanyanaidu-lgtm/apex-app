const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { readDB } = require('../models/dbHelper');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Get user from the token payload and attach to req
            const db = readDB();
            const user = db.users.find(u => u.id === decoded.id);

            if (!user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            // Exclude password
            const { pass: _, ...userWithoutPass } = user;
            req.user = userWithoutPass;

            next();
        } catch (error) {
            console.error('Auth Error:', error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const checkSubscription = (req, res, next) => {
    if (req.user && req.user.plan !== 'free') {
        const now = new Date();
        const expiryDate = new Date(req.user.planExpiry);

        if (req.user.planExpiry && expiryDate > now) {
            return next();
        } else {
            // Subscription expired
            return res.status(403).json({ error: 'Subscription expired. Please renew.' });
        }
    } else {
        res.status(403).json({ error: 'Premium feature. Please subscribe.' });
    }
};

module.exports = { protect, checkSubscription };
