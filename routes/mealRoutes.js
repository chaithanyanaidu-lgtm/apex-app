const express = require('express');
const { logMeal, getMealLogs, deleteMealLog } = require('../controllers/mealController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/log', protect, logMeal);
router.get('/logs/:date', protect, getMealLogs);
router.delete('/log/:id', protect, deleteMealLog);

module.exports = router;
