/* File: src/routes/StatsRoutes.js */
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/StatsController');

// Định nghĩa API: /api/stats/revenue
router.get('/revenue', statsController.getRevenue);

module.exports = router;