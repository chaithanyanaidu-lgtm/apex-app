const express = require('express');
const { logWorkout, getWorkoutLogs, getWeeklyLogs } = require('../controllers/workoutController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/log', protect, logWorkout);
router.get('/logs', protect, getWorkoutLogs);
router.get('/weekly', protect, getWeeklyLogs);

module.exports = router;
