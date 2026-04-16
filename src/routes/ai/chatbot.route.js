const express = require('express');
const router = express.Router();
const chatbotController = require('../../controllers/ai/chatbot.controller'); 

// Tạo đường dẫn API
router.post('/consult', chatbotController.consultCustomer);

module.exports = router;