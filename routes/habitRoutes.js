const express = require('express');
const { getHabits, addHabit, deleteHabit, toggleHabitLog, getWeeklyHabitLogs, getAllHabitLogs } = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getHabits);
router.post('/', protect, addHabit);
router.delete('/:id', protect, deleteHabit);

router.post('/log', protect, toggleHabitLog);
router.get('/logs/:weekStart', protect, getWeeklyHabitLogs);
router.get('/logs/all', protect, getAllHabitLogs);

module.exports = router;
