/** DPGNotes NOVA - Agent Router */
const express = require('express');
const router = express.Router();
const { handleAgentQuery, getAvailableAgentTools } = require('../controllers/agentController');
router.post('/', handleAgentQuery);
router.get('/tools', getAvailableAgentTools);
module.exports = router;
