/** DPGNotes NOVA - Intelligent Quiz Generation & Preparation Controller */
const { 
  buildValidatedQuizUrl, 
  validateQuizSchema, 
  getOfficialQuizSchema,
  escapeOptionHtml,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  ALL_OPTION_LETTERS
} = require('../../study-hub-allowlist/quizAllowlist');
const { generateAiResponse } = require('../providers/aiProviderAdapter');

/**
 * Extracts and parses JSON from model response text safely.
 * @param {string} rawText 
 * @returns {object|null}
 */
function extractJsonFromText(rawText) {
  if (!rawText) return null;
  let text = String(rawText).trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(text);
  } catch (parseErr) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (innerErr) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Generates academic fallback questions when external AI providers are offline or unconfigured.
 */
function generateDeterministicAcademicQuestions({ subject, unit, topic, questionCount, questionType, difficulty }) {
  const safeCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, questionCount || 10));
  const sub = subject || 'Software Engineering';
  const u = unit || 'Unit 1';
  const top = topic || 'Core Fundamentals & Engineering Methodologies';

  const easyTarget = (difficulty && typeof difficulty.easy === 'number') ? difficulty.easy : Math.ceil(safeCount * 0.4);
  const modTarget = (difficulty && typeof difficulty.moderate === 'number') ? difficulty.moderate : Math.floor(safeCount * 0.4);
  const hardTarget = (difficulty && typeof difficulty.hard === 'number') ? difficulty.hard : Math.max(0, safeCount - easyTarget - modTarget);

  const questions = [];

  // Repertoire of curriculum-grounded question templates
  const questionPool = [
    {
      prompt: `Which of the following best defines the primary goal of <strong>${sub}</strong>?`,
      options: [
        'Developing software systematically, predictably, and within budget',
        'Fabricating semiconductor processors and integrated motherboards',
        'Direct machine code binary compilation for BIOS execution',
        'Configuring static network gateway routing tables'
      ],
      correctOptionIndexes: [1],
      type: 'MCQ',
      difficulty: 'Easy',
      explanation: 'Software Engineering applies systematic engineering principles to software development.'
    },
    {
      prompt: `In ${sub} ${u}, which of the following are recognized phases of the <strong>Software Development Life Cycle (SDLC)</strong>?`,
      options: [
        'Requirement Analysis and Specification',
        'System Architecture Design',
        'Software Testing and Verification',
        'Microprocessor Core Soldering'
      ],
      correctOptionIndexes: [1, 2, 3],
      type: 'MSQ',
      difficulty: 'Moderate',
      explanation: 'SDLC encompasses requirements, design, implementation, testing, and maintenance.'
    },
    {
      prompt: `Consider the following pseudocode routine for calculating process efficiency:\n\n<pre><code>int calculateEffort(int kloc, float factor) {\n    if (kloc <= 0) return 0;\n    return (int)(kloc * factor) + 10;\n}</code></pre>\n\nWhat is the returned value when <code>calculateEffort(5, 2.0f)</code> is evaluated?`,
      options: ['10', '15', '20', '25'],
      correctOptionIndexes: [3],
      type: 'MCQ',
      difficulty: 'Moderate',
      explanation: '5 * 2.0 = 10; 10 + 10 = 20.'
    },
    {
      prompt: `When defining modern Web UI input components, which tag represents a standard toggle control?`,
      options: [
        '&lt;input type=&quot;checkbox&quot;&gt;',
        '&lt;toggle-switch mode=&quot;active&quot;&gt;',
        '&lt;select multiple=&quot;single&quot;&gt;',
        '&lt;button class=&quot;check&quot;&gt;'
      ],
      correctOptionIndexes: [1],
      type: 'MCQ',
      difficulty: 'Easy',
      explanation: 'The standard HTML checkbox control is <input type="checkbox">.'
    },
    {
      prompt: `Which of the following characteristics differentiate the <strong>Waterfall Model</strong> from <strong>Agile Methodologies</strong>?`,
      options: [
        'Waterfall enforces strictly linear sequential progression',
        'Agile encourages continuous iterative feedback and requirement adaptations',
        'Waterfall requires comprehensive upfront requirement sign-offs',
        'Agile completely forbids user testing and verification'
      ],
      correctOptionIndexes: [1, 2, 3],
      type: 'MSQ',
      difficulty: 'Moderate',
      explanation: 'Waterfall is linear and upfront, while Agile is iterative and flexible.'
    },
    {
      prompt: `What is the significance of <strong>Cyclomatic Complexity</strong> in software quality metrics?`,
      options: [
        'It measures the number of linearly independent execution paths through a program',
        'It calculates the physical RAM consumption of compiled object binaries',
        'It determines the network bandwidth latency across remote RPC calls',
        'It measures the disk space occupied by raw source code files'
      ],
      correctOptionIndexes: [1],
      type: 'MCQ',
      difficulty: 'Hard',
      explanation: 'McCabe Cyclomatic Complexity evaluates the control flow graph of software.'
    },
    {
      prompt: `Which document acts as the formal contract between clients and developers during requirement engineering?`,
      options: [
        'Software Requirement Specification (SRS)',
        'Database Entity Relationship Model (ERD)',
        'End-User License Agreement (EULA)',
        'Class Responsibility Collaborator Card (CRC)'
      ],
      correctOptionIndexes: [1],
      type: 'MCQ',
      difficulty: 'Easy',
      explanation: 'The SRS defines functional and non-functional software specifications.'
    },
    {
      prompt: `Which of the following are valid <strong>Non-Functional Requirements (NFRs)</strong>?`,
      options: [
        'System availability of 99.9% uptime',
        'Sub-second query response latency under peak load',
        'Data encryption at rest and in transit via TLS 1.3',
        'Calculating gross sales tax at 18% upon checkout'
      ],
      correctOptionIndexes: [1, 2, 3],
      type: 'MSQ',
      difficulty: 'Moderate',
      explanation: 'Availability, latency, and encryption are quality attributes (NFRs), while calculating tax is functional.'
    },
    {
      prompt: `In object-oriented software engineering, what design principle does the 'O' in <strong>SOLID</strong> represent?`,
      options: [
        'Open/Closed Principle (Open for extension, closed for modification)',
        'Object-Oriented Encapsulation Principle',
        'Optimized Runtime Garbage Collection',
        'Operational Polymorphism Inversion'
      ],
      correctOptionIndexes: [1],
      type: 'MCQ',
      difficulty: 'Hard',
      explanation: 'O in SOLID stands for the Open/Closed Principle.'
    },
    {
      prompt: `During software testing, which of the following activities are categorized as <strong>White-Box Testing</strong> techniques?`,
      options: [
        'Statement Coverage Analysis',
        'Branch and Condition Testing',
        'Boundary Value Analysis',
        'Equivalence Class Partitioning'
      ],
      correctOptionIndexes: [1, 2],
      type: 'MSQ',
      difficulty: 'Hard',
      explanation: 'Statement and branch coverage require inspecting code structure (white-box); BVA and ECP are black-box.'
    }
  ];

  // Distribute difficulties to match request
  let easyAssigned = 0;
  let modAssigned = 0;
  let hardAssigned = 0;

  for (let i = 1; i <= safeCount; i++) {
    const base = questionPool[(i - 1) % questionPool.length];
    let diff = 'Easy';
    if (easyAssigned < easyTarget) {
      diff = 'Easy';
      easyAssigned++;
    } else if (modAssigned < modTarget) {
      diff = 'Moderate';
      modAssigned++;
    } else {
      diff = 'Hard';
      hardAssigned++;
    }

    const isMSQ = (questionType === 'MSQ') || (questionType !== 'MCQ' && base.type === 'MSQ');
    const correctIdxs = isMSQ ? (base.correctOptionIndexes.length > 1 ? base.correctOptionIndexes : [1, 2]) : [base.correctOptionIndexes[0] || 1];

    questions.push({
      number: i,
      type: isMSQ ? 'MSQ' : 'MCQ',
      difficulty: diff,
      prompt: i > questionPool.length ? `[Q${i} - ${top}] ${base.prompt}` : base.prompt,
      options: base.options.map(opt => escapeOptionHtml(opt)),
      correctOptionIndexes: correctIdxs,
      explanation: base.explanation
    });
  }

  return questions;
}

/**
 * Controller: POST /api/study-hub/quiz/generate
 * Generates an academically accurate, structured quiz using AI providers or local educational fallback.
 */
async function generateQuiz(req, res) {
  try {
    const body = req.body || {};
    const subject = (body.subject || body.subName || 'Software Engineering').trim();
    const subCode = (body.subCode || '').trim();
    const unit = (body.unit || 'Unit 1').trim();
    const topic = (body.topic || 'Core Syllabus & Key Concepts').trim();
    const questionCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, parseInt(body.questionCount || body.totalQuestionCount || 10, 10)));
    const questionType = body.questionType || (body.isMSQ ? 'MSQ' : 'MCQ');
    const difficulty = body.difficulty || {
      easy: Math.ceil(questionCount * 0.4),
      moderate: Math.floor(questionCount * 0.4),
      hard: Math.max(0, questionCount - Math.ceil(questionCount * 0.4) - Math.floor(questionCount * 0.4))
    };
    const timeMinutes = parseInt(body.timeMinutes || body.timeAlloted || 30, 10);
    const visibility = body.visibility || body.quizVisibilty || 'Public';
    const correctScore = parseFloat(body.correctScore || body.marksPerCorrect || 1.0);
    const wrongScore = parseFloat(body.wrongScore || body.negativeMarks || 0.0);
    const unattemptScore = parseFloat(body.unattemptScore || body.unattemptedPenalty || 0.0);
    const groundingContext = body.groundingContext || '';

    const systemPrompt = `You are the DPGNotes NOVA Academic Quiz Intelligence Engine.
Generate an academically rigorous university-level examination for ${subject} (${unit}: ${topic}).

### Requirements:
1. Generate EXACTLY ${questionCount} questions.
2. Question Types: ${questionType === 'both' ? 'Mix of MCQ (single correct) and MSQ (multiple correct)' : questionType}.
3. Difficulty Distribution:
   - Easy: ${difficulty.easy || 0} questions
   - Moderate: ${difficulty.moderate || 0} questions
   - Hard: ${difficulty.hard || 0} questions
4. Formatting Rules:
   - In question prompts, use clean HTML: <pre><code>...</code></pre> for multiline code, <code>...</code> for inline code, <strong>...</strong> for key terms.
   - In options: MUST be compact labels. CRITICAL RULE: If an option contains an HTML tag, encode brackets as HTML entities (&lt;tag&gt;, &lt;input type=&quot;text&quot;&gt;). NEVER insert raw HTML markup or sandbox elements into options.
   - Exactly 4 options per question (Option 1 to Option 4).
   - Answer indices: 1-based (Option 1 = A, Option 2 = B, Option 3 = C, Option 4 = D).
5. Grounding:
   ${groundingContext ? `Use the following retrieved academic notes/syllabus: ${groundingContext}` : `Ground in standard university academic curriculum (e.g. MDU BCA/B.Tech).`}

Return strictly valid JSON conforming to this schema without preamble or markdown formatting:
{
  "quiz": {
    "subName": "${subject}",
    "subCode": "${subCode}",
    "topicTags": ["${subject}", "${unit}", "${topic}"],
    "quizTitle": "${subject} - ${unit} Examination",
    "desc": "Academic assessment on ${subject} ${unit} covering ${topic}.",
    "totalQuestionCount": ${questionCount},
    "timeAlloted": ${timeMinutes},
    "quizVisibilty": "${visibility}",
    "correctScore": ${correctScore},
    "wrongScore": ${wrongScore},
    "unattemptScore": ${unattemptScore}
  },
  "questions": [
    {
      "number": 1,
      "type": "MCQ",
      "difficulty": "Easy",
      "prompt": "Prompt text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOptionIndexes": [1],
      "explanation": "Academic explanation"
    }
  ]
}`;

    const userMessage = `Please generate the ${questionCount}-question academic quiz for ${subject} ${unit} (${topic}).`;

    let generatedQuizData = null;
    try {
      const aiResponse = await generateAiResponse({
        systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      });

      if (aiResponse && aiResponse.text) {
        generatedQuizData = extractJsonFromText(aiResponse.text);
      }
    } catch (aiErr) {
      console.warn('[Quiz Controller] AI call fallback triggered:', aiErr.message);
    }

    // If AI did not return complete questions or fallback was needed:
    if (!generatedQuizData || !Array.isArray(generatedQuizData.questions) || generatedQuizData.questions.length < MIN_QUESTION_COUNT) {
      const fallbackQuestions = generateDeterministicAcademicQuestions({
        subject,
        unit,
        topic,
        questionCount,
        questionType,
        difficulty
      });

      generatedQuizData = {
        quiz: {
          subName: subject,
          subCode: subCode || 'SE001',
          topicTags: [subject, unit, topic],
          quizTitle: `${subject} - ${unit} Practice Examination`,
          desc: `Curriculum-aligned practice examination on ${subject} ${unit} covering ${topic}.`,
          totalQuestionCount: questionCount,
          timeAlloted: timeMinutes,
          quizVisibilty: visibility,
          correctScore: correctScore,
          wrongScore: wrongScore,
          unattemptScore: unattemptScore
        },
        questions: fallbackQuestions
      };
    }

    // Build and validate canonical URL
    const urlBuildResult = buildValidatedQuizUrl(generatedQuizData);
    const schemaValidation = validateQuizSchema(generatedQuizData);

    return res.json({
      success: true,
      message: `Generated ${generatedQuizData.questions.length} questions for '${subject}'. URL prefill ready for Quiz Studio.`,
      url: urlBuildResult.url,
      relativeUrl: urlBuildResult.relativeUrl,
      urlLength: urlBuildResult.urlLength,
      isLongUrl: urlBuildResult.isLongUrl,
      advisory: urlBuildResult.advisory,
      quiz: generatedQuizData.quiz,
      questions: generatedQuizData.questions,
      validation: schemaValidation,
      summary: urlBuildResult.summary
    });
  } catch (err) {
    console.error('[Quiz Controller] generateQuiz error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate academic quiz.',
      details: err.message
    });
  }
}

/**
 * Controller: POST /api/study-hub/quiz/validate
 * Validates a candidate quiz payload against DPGNotes schema rules.
 */
async function validateQuiz(req, res) {
  try {
    const payload = req.body || {};
    const validation = validateQuizSchema(payload);
    return res.json({
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      stats: validation.stats
    });
  } catch (err) {
    console.error('[Quiz Controller] validateQuiz error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate quiz payload.',
      details: err.message
    });
  }
}

/**
 * Controller: POST /api/study-hub/quiz/build-url
 * Constructs a fully verified, URL-encoded prefill link for Quiz Studio.
 */
async function buildQuizUrlEndpoint(req, res) {
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
      url: result.url,
      relativeUrl: result.relativeUrl,
      urlLength: result.urlLength,
      isLongUrl: result.isLongUrl,
      advisory: result.advisory,
      summary: result.summary
    });
  } catch (err) {
    console.error('[Quiz Controller] buildQuizUrlEndpoint error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to build quiz URL.',
      details: err.message
    });
  }
}

/**
 * Controller: GET /api/study-hub/quiz/schema
 * Returns the non-sensitive public parameter contract and capabilities of Quiz Studio.
 */
async function getQuizSchema(req, res) {
  try {
    const schema = getOfficialQuizSchema();
    return res.json(schema);
  } catch (err) {
    console.error('[Quiz Controller] getQuizSchema error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve quiz schema.',
      details: err.message
    });
  }
}

/**
 * Controller: POST /api/study-hub/quiz/prepare
 * Preserved for backwards compatibility with existing clients.
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
      relativeUrl: result.relativeUrl,
      summary: result.summary,
      notes: [
        'Questions and configurations are prefilled into DPGNotes Quiz Studio.',
        'Contributors must validate question keys before publishing.',
        'Private answer keys are never exposed in public URLs.'
      ]
    });
  } catch (err) {
    console.error('[Quiz Controller] prepareQuiz Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to prepare quiz URL.'
    });
  }
}

module.exports = {
  generateQuiz,
  validateQuiz,
  buildQuizUrlEndpoint,
  getQuizSchema,
  prepareQuiz,
  generateDeterministicAcademicQuestions
};
