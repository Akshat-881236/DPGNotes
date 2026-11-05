/** DPGNotes NOVA - Quiz Preparation Controller */
const { buildValidatedQuizUrl } = require('../../study-hub-allowlist/quizAllowlist');
/**
 * Handler for POST /api/study-hub/quiz/prepare
 */
async function prepareQuiz(req, res) {
  try {
    const payload = req.body || {};
    const result = buildValidatedQuizUrl(payload);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid quiz configuration parameters.'
      });
    }
    return res.json({
      success: true,
      message: 'Quiz configuration generated successfully. Open the Quiz Studio to review and publish.',
      url: result.url,
      summary: result.summary,
      notes: [
        'Questions and configurations are prefilled into DPGNotes Quiz Studio.',
        'Contributors must validate question keys before publishing.',
        'Private answer keys are never exposed in public URLs.'
      ]
    });
  } catch (err) {
    console.error('[Quiz Controller] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to prepare quiz URL.'
    });
  }
}
module.exports = {
  prepareQuiz
};
