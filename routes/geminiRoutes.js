const express = require('express');
const { proxyGemini } = require('../controllers/geminiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, proxyGemini);

module.exports = router;
