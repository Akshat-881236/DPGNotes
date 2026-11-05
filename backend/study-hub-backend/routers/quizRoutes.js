/** DPGNotes NOVA - Quiz Router */
const express = require('express');
const router = express.Router();
const { 
  generateQuiz,
  validateQuiz,
  buildQuizUrlEndpoint,
  getQuizSchema,
  prepareQuiz 
} = require('../controllers/quizController');

router.post('/generate', generateQuiz);
router.post('/validate', validateQuiz);
router.post('/build-url', buildQuizUrlEndpoint);
router.get('/schema', getQuizSchema);
router.post('/prepare', prepareQuiz);

module.exports = router;
