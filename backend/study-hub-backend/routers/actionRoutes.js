/** DPGNotes NOVA - Actions Router */
const express = require('express');
const router = express.Router();
const { handleActionExecute } = require('../controllers/actionController');
router.post('/execute', handleActionExecute);
module.exports = router;
