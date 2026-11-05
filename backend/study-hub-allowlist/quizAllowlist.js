/** DPGNotes NOVA - Quiz Generator Allowlist, Schema Validator & URL Builder */
const VALID_TIME_MINUTES = [15, 20, 30, 45, 60, 90, 120, 150, 180];
const MIN_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 120;
const SAFE_URL_CHAR_LIMIT = 6000;
const EXTREME_URL_CHAR_LIMIT = 14000;
const ALL_OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/**
 * Escapes literal HTML angle brackets and quotes in quiz options.
 * Prevents unintended execution or formatting interference by quick tools.
 * @param {string} str 
 * @returns {string}
 */
function escapeOptionHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&(?!(amp|lt|gt|quot|#39);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Validates a quiz object against official DPGNotes Quiz Studio rules.
 * @param {object} quizData 
 * @returns {{ valid: boolean, errors: string[], warnings: string[], stats: object }}
 */
function validateQuizSchema(quizData = {}) {
  const errors = [];
  const warnings = [];
  const metadata = quizData.quiz || quizData;
  const questions = Array.isArray(quizData.questions) ? quizData.questions : (metadata.questions || []);

  if (!metadata.subName || !String(metadata.subName).trim()) {
    errors.push('Subject Name (subName) is mandatory.');
  }
  if (!metadata.quizTitle || !String(metadata.quizTitle).trim()) {
    errors.push('Quiz Title (quizTitle) is mandatory.');
  }

  const rawTotalQ = metadata.totalQuestionCount ?? metadata.questionCount;
  let qCount = parseInt(rawTotalQ, 10);
  if (isNaN(qCount)) {
    qCount = questions.length || MIN_QUESTION_COUNT;
  }
  if (qCount < MIN_QUESTION_COUNT) {
    errors.push(`Quiz question count (${qCount}) is below the minimum allowed limit of ${MIN_QUESTION_COUNT} questions.`);
  } else if (qCount > MAX_QUESTION_COUNT) {
    errors.push(`Quiz question count (${qCount}) exceeds the maximum allowed limit of ${MAX_QUESTION_COUNT} questions.`);
  }

  const rawTime = metadata.timeAlloted ?? metadata.timeMinutes ?? metadata.timeAllocated ?? 30;
  const timeVal = parseInt(rawTime, 10);
  if (isNaN(timeVal) || timeVal <= 0) {
    warnings.push(`Quiz duration (${rawTime}) is not a valid positive number. Defaulting to 30 minutes.`);
  }

  let mcqCount = 0;
  let msqCount = 0;
  const difficultyCounts = { Easy: 0, Moderate: 0, Hard: 0 };

  if (questions.length > 0) {
    if (questions.length !== qCount) {
      warnings.push(`Specified question count (${qCount}) differs from questions array length (${questions.length}). Total question count will align with available questions.`);
    }

    questions.forEach((q, idx) => {
      const qNum = q.number || idx + 1;
      const prompt = q.prompt || q.questionText || q.qText;
      if (!prompt || !String(prompt).trim()) {
        errors.push(`Question ${qNum} has an empty prompt statement.`);
      }

      const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'object' && q.options !== null ? Object.values(q.options) : []);
      if (!options || options.length < 3) {
        errors.push(`Question ${qNum} must have at least 3 options (found ${options ? options.length : 0}).`);
      } else if (options.length > 12) {
        errors.push(`Question ${qNum} exceeds maximum supported option limit of 12 options.`);
      }

      // Check correctOptionIndexes (1-based preferred: 1 for A, 2 for B...)
      let correctIndexes = [];
      if (Array.isArray(q.correctOptionIndexes)) {
        correctIndexes = q.correctOptionIndexes.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
      } else if (q.correctOptionIndex !== undefined && q.correctOptionIndex !== null) {
        correctIndexes = [parseInt(q.correctOptionIndex, 10)].filter(n => !isNaN(n));
      } else if (q.correctKey || q.correctOption) {
        const keyLetters = String(q.correctKey || q.correctOption).split(',').map(s => s.trim().toUpperCase());
        correctIndexes = keyLetters.map(l => ALL_OPTION_LETTERS.indexOf(l) + 1).filter(n => n > 0);
      }

      if (correctIndexes.length === 0) {
        errors.push(`Question ${qNum} has no designated correct answer key.`);
      }

      // Check for 0-based conversion if any index is 0
      if (correctIndexes.includes(0)) {
        correctIndexes = correctIndexes.map(idx => (idx === 0 ? 1 : idx));
      }

      // Check index bounds against options
      const invalidBounds = correctIndexes.filter(idx => idx < 1 || idx > options.length);
      if (invalidBounds.length > 0) {
        errors.push(`Question ${qNum} specifies answer key index [${invalidBounds.join(', ')}] outside valid option range (1 to ${options.length}).`);
      }

      // Question type classification
      const isMSQ = (String(q.type).toUpperCase() === 'MSQ') || correctIndexes.length > 1;
      if (isMSQ) {
        msqCount++;
        if (correctIndexes.length < 2) {
          warnings.push(`Question ${qNum} is marked as MSQ but only specifies 1 correct answer.`);
        }
      } else {
        mcqCount++;
        if (correctIndexes.length > 1) {
          warnings.push(`Question ${qNum} has multiple correct answers but was classified as MCQ.`);
        }
      }

      if (q.difficulty) {
        const diffKey = String(q.difficulty).charAt(0).toUpperCase() + String(q.difficulty).slice(1).toLowerCase();
        if (difficultyCounts[diffKey] !== undefined) {
          difficultyCounts[diffKey]++;
        }
      }
    });
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    stats: {
      totalQuestions: questions.length || qCount,
      mcqCount,
      msqCount,
      difficultyCounts
    }
  };
}

/**
 * Builds the canonical DPGNotes Quiz Studio URL according to the official contract.
 * @param {object} params 
 * @returns {{ valid: boolean, url: string, summary: object, error?: string, urlLength: number, isLongUrl: boolean, advisory?: string }}
 */
function buildValidatedQuizUrl(params = {}) {
  const metadata = params.quiz || params;
  const questions = Array.isArray(params.questions) ? params.questions : (Array.isArray(metadata.questions) ? metadata.questions : []);

  if (!metadata.subName || !metadata.quizTitle) {
    return {
      valid: false,
      error: 'Subject name (subName) and Quiz title (quizTitle) are mandatory.'
    };
  }

  const subName = String(metadata.subName).trim().slice(0, 100);
  const quizTitle = String(metadata.quizTitle).trim().slice(0, 150);
  const subCode = metadata.subCode ? String(metadata.subCode).trim().slice(0, 30) : '';
  const topicTags = Array.isArray(metadata.topicTags) ? metadata.topicTags.join(', ').slice(0, 150) : (metadata.topicTags ? String(metadata.topicTags).trim().slice(0, 150) : '');
  const desc = metadata.desc || metadata.quizDescription ? String(metadata.desc || metadata.quizDescription).trim().slice(0, 500) : '';

  let timeMinutes = 30;
  const rawTime = metadata.timeAlloted ?? metadata.timeMinutes ?? metadata.timeAllocated;
  if (rawTime) {
    const parsed = parseInt(rawTime, 10);
    if (VALID_TIME_MINUTES.includes(parsed)) {
      timeMinutes = parsed;
    } else if (!isNaN(parsed) && parsed > 0) {
      timeMinutes = parsed;
    }
  }

  let totalQuestions = MIN_QUESTION_COUNT;
  const rawCount = metadata.totalQuestionCount ?? metadata.questionCount;
  if (rawCount) {
    const parsed = parseInt(rawCount, 10);
    if (!isNaN(parsed) && parsed >= MIN_QUESTION_COUNT && parsed <= MAX_QUESTION_COUNT) {
      totalQuestions = parsed;
    } else if (!isNaN(parsed) && parsed > MAX_QUESTION_COUNT) {
      totalQuestions = MAX_QUESTION_COUNT;
    }
  }
  if (questions.length > totalQuestions) {
    totalQuestions = Math.min(MAX_QUESTION_COUNT, questions.length);
  }

  const rawVis = String(metadata.quizVisibilty || metadata.visibility || 'Public').toLowerCase();
  const quizVisibilty = rawVis === 'private' ? 'Private' : 'Public';
  const correctScore = parseFloat(metadata.correctScore ?? metadata.marksPerCorrect) > 0 ? parseFloat(metadata.correctScore ?? metadata.marksPerCorrect) : 1;
  const wrongScore = parseFloat(metadata.wrongScore ?? metadata.negativeMarks) >= 0 ? parseFloat(metadata.wrongScore ?? metadata.negativeMarks) : 0;
  const unattemptScore = parseFloat(metadata.unattemptScore ?? metadata.unattemptedPenalty) >= 0 ? parseFloat(metadata.unattemptScore ?? metadata.unattemptedPenalty) : 0;

  const url = new URL('https://dpgnotes.web.app/Quizes/quiz-generator.html');

  // Exact documented metadata parameters
  url.searchParams.set('subName', subName);
  if (subCode) url.searchParams.set('subCode', subCode);
  if (topicTags) url.searchParams.set('topicTags', topicTags);
  url.searchParams.set('quizTitle', quizTitle);
  if (desc) url.searchParams.set('desc', desc);
  url.searchParams.set('totalQuestionCount', String(totalQuestions));
  url.searchParams.set('timeAlloted', String(timeMinutes));
  url.searchParams.set('quizVisibilty', quizVisibilty);
  url.searchParams.set('correctScore', String(correctScore));
  url.searchParams.set('wrongScore', String(wrongScore));
  url.searchParams.set('unattemptScore', String(unattemptScore));

  let questionsAddedCount = 0;
  let mcqCount = 0;
  let msqCount = 0;

  if (questions.length > 0) {
    const limitToAdd = Math.min(questions.length, totalQuestions, MAX_QUESTION_COUNT);
    for (let i = 0; i < limitToAdd; i++) {
      const q = questions[i];
      const qIdx = i + 1;
      const prompt = q.prompt || q.questionText || q.qText || '';

      if (prompt) {
        url.searchParams.set(`q${qIdx}`, String(prompt).trim());
        questionsAddedCount++;

        // Format and set options: qNo1, qNo2, qNo3, qNo4...
        const optionsList = Array.isArray(q.options)
          ? q.options
          : (typeof q.options === 'object' && q.options !== null ? Object.values(q.options) : []);

        const maxOpts = Math.min(12, Math.max(3, optionsList.length));
        for (let o = 0; o < maxOpts; o++) {
          const optVal = optionsList[o] !== undefined ? String(optionsList[o]).trim() : '';
          if (optVal) {
            // Apply critical HTML entity encoding to literal tags
            const safeOpt = escapeOptionHtml(optVal);
            url.searchParams.set(`q${qIdx}o${o + 1}`, safeOpt);
          }
        }

        // Determine correct answer indices (1-based: 1 for A, 2 for B...)
        let correctIndices = [];
        if (Array.isArray(q.correctOptionIndexes)) {
          correctIndices = q.correctOptionIndexes.map(v => parseInt(v, 10)).filter(n => !isNaN(n));
        } else if (q.correctOptionIndex !== undefined && q.correctOptionIndex !== null) {
          correctIndices = [parseInt(q.correctOptionIndex, 10)].filter(n => !isNaN(n));
        } else if (q.correctKey || q.correctOption) {
          const keyLetters = String(q.correctKey || q.correctOption).split(',').map(s => s.trim().toUpperCase());
          correctIndices = keyLetters.map(l => ALL_OPTION_LETTERS.indexOf(l) + 1).filter(n => n > 0);
        }

        // Normalize 0-based to 1-based if necessary
        if (correctIndices.includes(0)) {
          correctIndices = correctIndices.map(idx => (idx === 0 ? 1 : idx));
        }

        if (correctIndices.length > 1) {
          msqCount++;
          correctIndices.forEach((cIdx, kIdx) => {
            url.searchParams.set(`q${qIdx}correctOption${kIdx + 1}Index`, String(cIdx));
          });
        } else if (correctIndices.length === 1) {
          mcqCount++;
          url.searchParams.set(`q${qIdx}correctOption1Index`, String(correctIndices[0]));
        } else {
          // Default to Option 1 (A) if none specified to preserve editor initialization
          mcqCount++;
          url.searchParams.set(`q${qIdx}correctOption1Index`, '1');
        }
      }
    }
  }

  const finalUrl = url.toString();
  const urlLength = finalUrl.length;
  const isLongUrl = urlLength > SAFE_URL_CHAR_LIMIT;

  let advisory = 'Ready for Quiz Studio authoring and review.';
  if (urlLength > EXTREME_URL_CHAR_LIMIT) {
    advisory = `Notice: Generated URL length is ${urlLength} characters, which approaches browser and proxy URL limits. Modern desktop browsers support this, but for larger exams (60+ questions), splitting the quiz into parts or saving as draft in the studio is recommended.`;
  } else if (isLongUrl) {
    advisory = `Notice: Generated URL contains comprehensive questions (${urlLength} characters). Fully compatible with modern web browsers.`;
  }

  return {
    valid: true,
    url: finalUrl,
    relativeUrl: `/Quizes/quiz-generator.html?${url.searchParams.toString()}`,
    urlLength,
    isLongUrl,
    advisory,
    summary: {
      subName,
      subCode,
      quizTitle,
      topicTags,
      totalQuestionCount: totalQuestions,
      timeAlloted: timeMinutes,
      quizVisibilty,
      correctScore,
      wrongScore,
      unattemptScore,
      questionsGenerated: questionsAddedCount,
      mcqCount,
      msqCount
    }
  };
}

/**
 * Returns the non-sensitive public specification of the DPGNotes Quiz Studio.
 */
function getOfficialQuizSchema() {
  return {
    success: true,
    schemaVersion: '2.0',
    generator: '/Quizes/quiz-generator.html',
    canonicalBaseUrl: 'https://dpgnotes.web.app/Quizes/quiz-generator.html',
    questionCount: {
      minimum: MIN_QUESTION_COUNT,
      maximum: MAX_QUESTION_COUNT
    },
    answerIndexConvention: '1-based (Option 1 = A, Option 2 = B, Option 3 = C, Option 4 = D)',
    supportedQuestionTypes: ['MCQ (Single Correct)', 'MSQ (Multiple Correct)'],
    metadataParameters: [
      { name: 'subName', type: 'string', required: true, description: 'Academic subject name' },
      { name: 'subCode', type: 'string', required: false, description: 'Subject code / syllabus code' },
      { name: 'topicTags', type: 'string', required: false, description: 'Comma-separated topic keywords' },
      { name: 'quizTitle', type: 'string', required: true, description: 'Examination title' },
      { name: 'desc', type: 'string', required: false, description: 'Overview and student instructions' },
      { name: 'totalQuestionCount', type: 'integer', required: true, description: 'Question count (10-120)' },
      { name: 'timeAlloted', type: 'integer', required: true, description: 'Duration in minutes (15, 20, 30, 45, 60, 90, 120, 150, 180)' },
      { name: 'quizVisibilty', type: 'string', required: true, description: 'Visibility (Public or Private)' },
      { name: 'correctScore', type: 'number', required: false, default: 1.0, description: 'Marks per correct answer' },
      { name: 'wrongScore', type: 'number', required: false, default: 0.0, description: 'Negative marks per incorrect answer' },
      { name: 'unattemptScore', type: 'number', required: false, default: 0.0, description: 'Penalty for unattempted questions' }
    ],
    questionParameters: {
      prompt: 'qN (e.g. q1, q2, q3)',
      optionPattern: 'qNoM (e.g. q1o1, q1o2, q1o3, q1o4 where M is 1-based index 1..12)',
      mcqAnswerIndex: 'qNcorrectOption1Index (1-based index)',
      msqAnswerIndex: 'qNcorrectOption1Index, qNcorrectOption2Index, qNcorrectOption3Index...'
    },
    formattingCapabilities: {
      questionPrompt: ['plain text', '<code>inline code</code>', '<pre><code>multiline code</code></pre>', '<strong>bold</strong>', '<b>emphasis</b>', '<p>paragraphs</p>', '<ul><li>unordered lists</li></ul>', '<ol><li>ordered lists</li></ol>'],
      optionField: ['plain text', 'compact expressions', 'HTML entity escaped tags (&lt;html&gt;, &lt;input type=&quot;checkbox&quot;&gt;)'],
      unsupportedInQuiz: ['html-box', 'css-box', 'js-box', 'html-css-js-sandbox', 'adsense-ad', 'native-ad', 'comparison-table']
    },
    safeUrlLengthThresholds: {
      standardSafe: SAFE_URL_CHAR_LIMIT,
      extremeLimit: EXTREME_URL_CHAR_LIMIT
    },
    publishingWorkflow: 'URL prefilled draft -> Contributor review in Quiz Studio -> Manual publishing with verified Contributor Session -> Firestore persistence',
    verifiedAt: new Date().toISOString()
  };
}

module.exports = {
  VALID_TIME_MINUTES,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  SAFE_URL_CHAR_LIMIT,
  EXTREME_URL_CHAR_LIMIT,
  ALL_OPTION_LETTERS,
  escapeOptionHtml,
  validateQuizSchema,
  buildValidatedQuizUrl,
  getOfficialQuizSchema
};
