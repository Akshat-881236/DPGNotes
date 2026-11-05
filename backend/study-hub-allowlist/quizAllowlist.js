/** DPGNotes NOVA - Quiz Generator Allowlist & URL Builder */
const VALID_TIME_MINUTES = [15, 20, 30, 45, 60, 90, 120, 150, 180];
const MAX_URL_QUESTIONS = 30; // Protect against query string overflow
/**
 * Validates quiz generation parameters and builds the prefilled URL.
 * @param {object} params
 * @returns {{ valid: boolean, url?: string, summary?: object, error?: string }}
 */
function buildValidatedQuizUrl(params = {}) {
  if (!params.subName || !params.quizTitle) {
    return {
      valid: false,
      error: 'Subject name (subName) and Quiz title (quizTitle) are mandatory.'
    };
  }
  const subName = String(params.subName).trim().slice(0, 100);
  const quizTitle = String(params.quizTitle).trim().slice(0, 150);
  const subCode = params.subCode ? String(params.subCode).trim().slice(0, 30) : '';
  const topicTags = params.topicTags ? String(params.topicTags).trim().slice(0, 150) : '';
  const desc = params.desc ? String(params.desc).trim().slice(0, 500) : '';
  let timeMinutes = 30;
  if (params.timeMinutes) {
    const parsed = parseInt(params.timeMinutes, 10);
    if (VALID_TIME_MINUTES.includes(parsed)) {
      timeMinutes = parsed;
    }
  }
  let questionCount = 10;
  if (params.questionCount) {
    const qCount = parseInt(params.questionCount, 10);
    if (!isNaN(qCount) && qCount >= 1 && qCount <= 100) {
      questionCount = qCount;
    }
  }
  const visibility = (params.visibility === 'private') ? 'private' : 'public';
  const correctScore = parseFloat(params.correctScore) > 0 ? parseFloat(params.correctScore) : 1;
  const wrongScore = parseFloat(params.wrongScore) >= 0 ? parseFloat(params.wrongScore) : 0;
  const unattemptScore = parseFloat(params.unattemptScore) >= 0 ? parseFloat(params.unattemptScore) : 0;
  const searchParams = new URLSearchParams();
  searchParams.set('subName', subName);
  searchParams.set('quizTitle', quizTitle);
  if (subCode) searchParams.set('subCode', subCode);
  if (topicTags) searchParams.set('topicTags', topicTags);
  if (desc) searchParams.set('desc', desc);
  searchParams.set('timeMinutes', String(timeMinutes));
  searchParams.set('totalQuestionCount', String(questionCount));
  searchParams.set('quizVisibilty', visibility);
  searchParams.set('marksPerCorrect', String(correctScore));
  searchParams.set('negativeMarks', String(wrongScore));
  if (unattemptScore > 0) searchParams.set('unattemptedPenalty', String(unattemptScore));
  if (Array.isArray(params.questions) && params.questions.length > 0) {
    const countToAdd = Math.min(params.questions.length, MAX_URL_QUESTIONS);
    for (let i = 0; i < countToAdd; i++) {
      const q = params.questions[i];
      const qIdx = i + 1;
      if (q && q.prompt) {
        searchParams.set(`q${qIdx}`, String(q.prompt).trim());
        const options = Array.isArray(q.options) ? q.options : [];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        options.forEach((opt, oIdx) => {
          if (oIdx < 6) {
            searchParams.set(`q${qIdx}o${letters[oIdx]}`, String(opt).trim());
          }
        });
        if (q.type) searchParams.set(`q${qIdx}type`, q.type);
        if (q.correctOptionIndex !== undefined) {
          searchParams.set(`q${qIdx}correctOptionIndex`, String(q.correctOptionIndex));
        }
        if (q.explanation) {
          searchParams.set(`q${qIdx}explanation`, String(q.explanation).trim());
        }
      }
    }
    if (countToAdd > questionCount) {
      searchParams.set('totalQuestionCount', String(countToAdd));
      questionCount = countToAdd;
    }
  }
  const generatedUrl = `/Quizes/quiz-generator.html?${searchParams.toString()}`;
  return {
    valid: true,
    url: generatedUrl,
    summary: {
      subName,
      subCode,
      quizTitle,
      topicTags,
      timeMinutes,
      questionCount,
      visibility,
      correctScore,
      wrongScore,
      unattemptScore,
      questionsGenerated: Array.isArray(params.questions) ? params.questions.length : 0
    }
  };
}
module.exports = {
  VALID_TIME_MINUTES,
  MAX_URL_QUESTIONS,
  buildValidatedQuizUrl
};
