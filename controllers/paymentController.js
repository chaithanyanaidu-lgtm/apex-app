const { readDB, writeDB } = require('../models/dbHelper');

// Define plans
const plans = [
    { id: 'monthly', name: 'Monthly Plan', price: 49, durationDays: 30 },
    { id: 'quarterly', name: '3 Months Plan', price: 119, durationDays: 90 },
    { id: 'yearly', name: 'Yearly Plan', price: 399, durationDays: 365 }
];

const getPlans = (req, res) => {
    res.status(200).json({ plans });
};

const processPayment = (req, res) => {
    const { planId, paymentMethod, transactionRef } = req.body;

    // req.user from authMiddleware
    if (!req.user) {
        return res.status(401).json({ error: 'Not authorized' });
    }

    const selectedPlan = plans.find(p => p.id === planId);

    if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Mock successful payment
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Update User plan and expiry
    const now = new Date();
    // If user already has an active plan, extend it. Otherwise start from now.
    let currentExpiry = db.users[userIndex].planExpiry ? new Date(db.users[userIndex].planExpiry) : now;
    if (currentExpiry < now) currentExpiry = now;

    currentExpiry.setDate(currentExpiry.getDate() + selectedPlan.durationDays);

    db.users[userIndex].plan = selectedPlan.id;
    db.users[userIndex].planExpiry = currentExpiry.toISOString();

    // Store Payment History
    const newPayment = {
        id: Date.now().toString(),
        userId: req.user.id,
        email: req.user.email,
        planId: selectedPlan.id,
        amount: selectedPlan.price,
        paymentMethod: paymentMethod || 'Mock',
        transactionRef: transactionRef || `MOCK_TX_${Date.now()}`,
        date: new Date().toISOString(),
        status: 'completed'
    };

    db.payments.push(newPayment);
    writeDB(db);

    res.status(200).json({
        message: 'Payment successful, subscription updated!',
        subscription: {
            plan: db.users[userIndex].plan,
            planExpiry: db.users[userIndex].planExpiry
        },
        payment: newPayment
    });
};

module.exports = { getPlans, processPayment };
