/** DPGNotes NOVA - Knowledge Router */
const express = require('express');
const router = express.Router();
const { getPlatformKnowledge } = require('../controllers/knowledgeController');
router.get('/', getPlatformKnowledge);
router.get('/knowledge', getPlatformKnowledge);
module.exports = router;
