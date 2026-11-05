/** DPGNotes NOVA - Legal Router */
const express = require('express');
const router = express.Router();
const { getLegalDocumentation } = require('../controllers/legalController');
router.get('/', getLegalDocumentation);
module.exports = router;
