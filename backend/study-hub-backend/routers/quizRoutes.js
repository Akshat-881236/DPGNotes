/** DPGNotes NOVA - Quiz Router */
const express = require('express');
const router = express.Router();
const { prepareQuiz } = require('../controllers/quizController');
router.post('/prepare', prepareQuiz);
module.exports = router;
