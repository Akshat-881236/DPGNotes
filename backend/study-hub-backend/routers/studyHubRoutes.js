/** DPGNotes NOVA - Main Master Router */
const express = require('express');
const router = express.Router();
const { checkHealth } = require('../controllers/studyHubController');
const { handleChatConversation } = require('../controllers/conversationController');
const knowledgeRoutes = require('./knowledgeRoutes');
const agentRoutes = require('./agentRoutes');
const actionRoutes = require('./actionRoutes');
const quizRoutes = require('./quizRoutes');
const legalRoutes = require('./legalRoutes');
router.get('/', checkHealth);
router.get('/health', checkHealth);
router.post('/chat', handleChatConversation);
router.use('/knowledge', knowledgeRoutes);
router.use('/agent', agentRoutes);
router.use('/actions', actionRoutes);
router.use('/quiz', quizRoutes);
router.use('/legal', legalRoutes);
module.exports = router;
