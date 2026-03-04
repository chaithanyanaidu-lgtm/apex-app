const express = require('express');
const { getPlans, processPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/plans', getPlans);
router.post('/checkout', protect, processPayment);

module.exports = router;
