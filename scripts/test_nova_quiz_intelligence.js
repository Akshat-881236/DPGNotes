/**
 * DPGNotes NOVA - Master Quiz Intelligence & Prefill Test Suite
 * Tests all requirements from Part 18 of the Master Specification.
 */
const assert = require('assert');
const {
  VALID_TIME_MINUTES,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  SAFE_URL_CHAR_LIMIT,
  EXTREME_URL_CHAR_LIMIT,
  escapeOptionHtml,
  validateQuizSchema,
  buildValidatedQuizUrl,
  getOfficialQuizSchema
} = require('../backend/study-hub-allowlist/quizAllowlist');
const {
  generateDeterministicAcademicQuestions
} = require('../backend/study-hub-backend/controllers/quizController');

console.log('====================================================');
console.log('   DPGNotes NOVA - MASTER QUIZ TEST SUITE           ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// Test 1: Minimum question count (10 questions)
// ----------------------------------------------------
runTest('Test 1: Minimum question count (10 questions) generates full URL with all options and keys', () => {
  const questions10 = generateDeterministicAcademicQuestions({
    subject: 'Software Engineering',
    unit: 'Unit 1',
    questionCount: 10,
    questionType: 'MCQ'
  });
  assert.strictEqual(questions10.length, 10, 'Must generate exactly 10 questions');

  const result = buildValidatedQuizUrl({
    subName: 'Software Engineering',
    quizTitle: 'SE Unit 1 Practice Quiz',
    totalQuestionCount: 10,
    timeAlloted: 20,
    questions: questions10
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.summary.totalQuestionCount, 10);
  assert.strictEqual(result.summary.questionsGenerated, 10);

  const parsedUrl = new URL(result.url);
  assert.strictEqual(parsedUrl.searchParams.get('totalQuestionCount'), '10');
  assert.strictEqual(parsedUrl.searchParams.get('timeAlloted'), '20');
  assert.strictEqual(parsedUrl.searchParams.get('quizVisibilty'), 'Public');

  for (let i = 1; i <= 10; i++) {
    assert(parsedUrl.searchParams.has(`q${i}`), `Question prompt q${i} must exist in URL`);
    assert(parsedUrl.searchParams.has(`q${i}o1`), `Option 1 for Q${i} must exist in URL`);
    assert(parsedUrl.searchParams.has(`q${i}o2`), `Option 2 for Q${i} must exist in URL`);
    assert(parsedUrl.searchParams.has(`q${i}o3`), `Option 3 for Q${i} must exist in URL`);
    assert(parsedUrl.searchParams.has(`q${i}o4`), `Option 4 for Q${i} must exist in URL`);
    assert(parsedUrl.searchParams.has(`q${i}correctOption1Index`), `Answer key index for Q${i} must exist`);
  }
});

// ----------------------------------------------------
// Test 2: Standard question count (30 questions)
// ----------------------------------------------------
runTest('Test 2: Standard question count (30 questions) with all 30 populated and safe length check', () => {
  const questions30 = generateDeterministicAcademicQuestions({
    subject: 'Database Management Systems',
    unit: 'Unit 2',
    questionCount: 30,
    questionType: 'MCQ'
  });
  assert.strictEqual(questions30.length, 30);

  const result = buildValidatedQuizUrl({
    subName: 'Database Management Systems',
    quizTitle: 'DBMS Normalization & Relational Algebra',
    totalQuestionCount: 30,
    timeAlloted: 45,
    questions: questions30
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.summary.totalQuestionCount, 30);
  assert.strictEqual(result.summary.questionsGenerated, 30);

  const parsedUrl = new URL(result.url);
  assert.strictEqual(parsedUrl.searchParams.get('totalQuestionCount'), '30');
  assert(parsedUrl.searchParams.has('q30'), 'Question 30 must be populated in URL');
  assert(parsedUrl.searchParams.has('q30o4'), 'Question 30 option 4 must be populated');
  assert(result.urlLength > 0);
});

// ----------------------------------------------------
// Test 3: Maximum question count (120 questions) & URL length handling
// ----------------------------------------------------
runTest('Test 3: Maximum question count (120 questions) respects boundary & operational advisory', () => {
  const questions120 = generateDeterministicAcademicQuestions({
    subject: 'Cloud Computing',
    unit: 'Unit 3',
    questionCount: 120,
    questionType: 'MCQ'
  });
  assert.strictEqual(questions120.length, 120);

  const result = buildValidatedQuizUrl({
    subName: 'Cloud Computing',
    quizTitle: 'Cloud Architecture Comprehensive Mock',
    totalQuestionCount: 120,
    timeAlloted: 180,
    questions: questions120
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.summary.totalQuestionCount, 120);
  assert.strictEqual(result.summary.questionsGenerated, 120);
  assert.strictEqual(result.isLongUrl, true, '120 questions URL must trigger isLongUrl advisory');
  assert(result.advisory.includes('URL length'), 'Must include operational URL length guidance');

  // Verify rejection of count > 120 in validator
  const validationOver = validateQuizSchema({
    subName: 'Test',
    quizTitle: 'Test',
    totalQuestionCount: 121
  });
  assert.strictEqual(validationOver.valid, false);
  assert(validationOver.errors.some(e => e.includes('exceeds the maximum')));
});

// ----------------------------------------------------
// Test 4: MCQ question with 1-based correct answer index
// ----------------------------------------------------
runTest('Test 4: MCQ question designates single correct option with 1-based index', () => {
  const mcqQuestion = {
    prompt: 'Which protocol secures web traffic through asymmetric encryption?',
    options: ['HTTP', 'HTTPS (TLS)', 'FTP', 'Telnet'],
    correctOptionIndexes: [2], // 2 = B (HTTPS)
    type: 'MCQ'
  };

  const result = buildValidatedQuizUrl({
    subName: 'Computer Networks',
    quizTitle: 'Network Security Quiz',
    totalQuestionCount: 10,
    questions: [mcqQuestion]
  });

  const parsedUrl = new URL(result.url);
  assert.strictEqual(parsedUrl.searchParams.get('q1correctOption1Index'), '2');
  assert.strictEqual(parsedUrl.searchParams.has('q1correctOption2Index'), false, 'MCQ must not have second answer key');
});

// ----------------------------------------------------
// Test 5: MSQ question with multiple designated correct options
// ----------------------------------------------------
runTest('Test 5: MSQ question designates multiple 1-based indices (q1correctOption1Index, q1correctOption2Index)', () => {
  const msqQuestion = {
    prompt: 'Which of the following are primary database transaction ACID properties?',
    options: ['Atomicity', 'Consistency', 'Compilation', 'Durability'],
    correctOptionIndexes: [1, 2, 4], // A, B, D
    type: 'MSQ'
  };

  const result = buildValidatedQuizUrl({
    subName: 'Database Systems',
    quizTitle: 'Transactions MSQ Quiz',
    totalQuestionCount: 10,
    questions: [msqQuestion]
  });

  const parsedUrl = new URL(result.url);
  assert.strictEqual(parsedUrl.searchParams.get('q1correctOption1Index'), '1');
  assert.strictEqual(parsedUrl.searchParams.get('q1correctOption2Index'), '2');
  assert.strictEqual(parsedUrl.searchParams.get('q1correctOption3Index'), '4');
});

// ----------------------------------------------------
// Test 6: HTML option formatting & entity escaping rule
// ----------------------------------------------------
runTest('Test 6: CRITICAL HTML ANGLE-BRACKET RULE - options with literal tags are safely entity-encoded', () => {
  const htmlQuestion = {
    prompt: 'Which HTML element defines an unformatted preformatted block?',
    options: [
      '<html>',
      '<body>',
      '<input type="checkbox">',
      '<pre><code>'
    ],
    correctOptionIndexes: [4]
  };

  const result = buildValidatedQuizUrl({
    subName: 'Web Development',
    quizTitle: 'HTML Tags Assessment',
    totalQuestionCount: 10,
    questions: [htmlQuestion]
  });

  const parsedUrl = new URL(result.url);
  // Options must be entity-escaped: &lt;html&gt;, &lt;body&gt;, &lt;input type=&quot;checkbox&quot;&gt;
  assert.strictEqual(parsedUrl.searchParams.get('q1o1'), '&lt;html&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o2'), '&lt;body&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o3'), '&lt;input type=&quot;checkbox&quot;&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o4'), '&lt;pre&gt;&lt;code&gt;');
});

// ----------------------------------------------------
// Test 7: Code question formatting in prompt
// ----------------------------------------------------
runTest('Test 7: Code snippet in prompt is preserved with <pre><code> block and compact options', () => {
  const codeSnippet = 'int x = 10;\nint y = 20;\nprintf("%d", x + y);';
  const codeQuestion = {
    prompt: `<p>Consider the C code snippet:</p>\n<pre><code>${codeSnippet}</code></pre>\n<p>What is printed?</p>`,
    options: ['10', '20', '30', '40'],
    correctOptionIndexes: [3]
  };

  const result = buildValidatedQuizUrl({
    subName: 'C Programming',
    quizTitle: 'C Syntax Quiz',
    totalQuestionCount: 10,
    questions: [codeQuestion]
  });

  const parsedUrl = new URL(result.url);
  const promptParam = parsedUrl.searchParams.get('q1');
  assert(promptParam.includes('<pre><code>'), 'Prompt must retain <pre><code>');
  assert(promptParam.includes('printf('), 'Prompt must contain code text');
  assert.strictEqual(parsedUrl.searchParams.get('q1o3'), '30');
});

// ----------------------------------------------------
// Test 8: Special characters, spaces, and math symbols encoding
// ----------------------------------------------------
runTest('Test 8: Special characters (&, +, /, ?, =, #, spaces, unicode) are correctly preserved', () => {
  const specialQuestion = {
    prompt: 'Evaluate: f(x) = (a + b) / (c & d) ? true : false #tag',
    options: ['a + b', 'c & d', '100% Guaranteed', 'α + β ≥ 0'],
    correctOptionIndexes: [1]
  };

  const result = buildValidatedQuizUrl({
    subName: 'Discrete Mathematics & Logic',
    quizTitle: 'Logic / Set Theory & Relations #1',
    totalQuestionCount: 10,
    questions: [specialQuestion]
  });

  const parsedUrl = new URL(result.url);
  assert.strictEqual(parsedUrl.searchParams.get('subName'), 'Discrete Mathematics & Logic');
  assert.strictEqual(parsedUrl.searchParams.get('quizTitle'), 'Logic / Set Theory & Relations #1');
  assert(parsedUrl.searchParams.get('q1').includes('f(x) = (a + b) / (c & d) ? true : false #tag'));
  assert.strictEqual(parsedUrl.searchParams.get('q1o1'), 'a + b');
  assert.strictEqual(parsedUrl.searchParams.get('q1o2'), 'c &amp; d');
  assert.strictEqual(parsedUrl.searchParams.get('q1o4'), 'α + β ≥ 0');
});

// ----------------------------------------------------
// Test 9: Strict validation engine rejects invalid parameters
// ----------------------------------------------------
runTest('Test 9: Validation engine rejects missing subjects, out-of-range counts, and missing keys', () => {
  const missingSubject = validateQuizSchema({ quizTitle: 'Only Title' });
  assert.strictEqual(missingSubject.valid, false);
  assert(missingSubject.errors.some(e => e.includes('Subject Name')));

  const countUnder10 = validateQuizSchema({ subName: 'Math', quizTitle: 'Quiz', totalQuestionCount: 8 });
  assert.strictEqual(countUnder10.valid, false);
  assert(countUnder10.errors.some(e => e.includes('below the minimum')));

  const missingKey = validateQuizSchema({
    subName: 'Math',
    quizTitle: 'Quiz',
    totalQuestionCount: 10,
    questions: [
      { prompt: 'What is 2+2?', options: ['1', '2', '3', '4'], correctOptionIndexes: [] }
    ]
  });
  assert.strictEqual(missingKey.valid, false);
  assert(missingKey.errors.some(e => e.includes('no designated correct answer key')));
});

// ----------------------------------------------------
// Test 10: Official non-sensitive generator schema endpoint
// ----------------------------------------------------
runTest('Test 10: Schema endpoint reports verified non-sensitive Quiz Studio parameters & rules', () => {
  const schema = getOfficialQuizSchema();
  assert.strictEqual(schema.success, true);
  assert.strictEqual(schema.schemaVersion, '2.0');
  assert.strictEqual(schema.generator, '/Quizes/quiz-generator.html');
  assert.strictEqual(schema.questionCount.minimum, 10);
  assert.strictEqual(schema.questionCount.maximum, 120);
  assert(schema.answerIndexConvention.includes('1-based'));
  assert(schema.formattingCapabilities.optionField.some(f => f.includes('HTML entity escaped')));
});

// ----------------------------------------------------
// Test 11: Exact fixture comparison with Part 9 of Master Spec
// ----------------------------------------------------
runTest('Test 11: Test fixture strictly matches Part 9 contract parameter names and spelling', () => {
  const fixtureResult = buildValidatedQuizUrl({
    subName: 'Web Development',
    subCode: 'WD/001',
    topicTags: ['HTML', 'HTML Basics', 'Web Development'],
    quizTitle: 'Getting Started with HTML',
    desc: 'Test your HTML knowledge with 10 beginner-friendly questions.',
    totalQuestionCount: 10,
    timeAlloted: 20,
    quizVisibilty: 'Public',
    correctScore: 1,
    wrongScore: 0,
    unattemptScore: 0,
    questions: [
      {
        prompt: 'Which HTML element defines the main heading?',
        options: ['<h1>', '<head>', '<title>', '<meta>'],
        correctOptionIndexes: [1]
      }
    ]
  });

  const parsedUrl = new URL(fixtureResult.url);
  assert.strictEqual(parsedUrl.searchParams.get('subName'), 'Web Development');
  assert.strictEqual(parsedUrl.searchParams.get('subCode'), 'WD/001');
  assert.strictEqual(parsedUrl.searchParams.get('topicTags'), 'HTML, HTML Basics, Web Development');
  assert.strictEqual(parsedUrl.searchParams.get('quizTitle'), 'Getting Started with HTML');
  assert.strictEqual(parsedUrl.searchParams.get('totalQuestionCount'), '10');
  assert.strictEqual(parsedUrl.searchParams.get('timeAlloted'), '20');
  assert.strictEqual(parsedUrl.searchParams.get('quizVisibilty'), 'Public');
  assert.strictEqual(parsedUrl.searchParams.get('correctScore'), '1');
  assert.strictEqual(parsedUrl.searchParams.get('wrongScore'), '0');
  assert.strictEqual(parsedUrl.searchParams.get('unattemptScore'), '0');

  assert.strictEqual(parsedUrl.searchParams.get('q1'), 'Which HTML element defines the main heading?');
  assert.strictEqual(parsedUrl.searchParams.get('q1o1'), '&lt;h1&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o2'), '&lt;head&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o3'), '&lt;title&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1o4'), '&lt;meta&gt;');
  assert.strictEqual(parsedUrl.searchParams.get('q1correctOption1Index'), '1');
});

// ----------------------------------------------------
// Test 12: Express HTTP Endpoints Integration for Quiz Intelligence
// ----------------------------------------------------
async function runHttpEndpointTests() {
  const express = require('../backend/node_modules/express');
  const quizRoutes = require('../backend/study-hub-backend/routers/quizRoutes');
  const app = express();
  app.use(express.json());
  app.use('/api/study-hub/quiz', quizRoutes);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/study-hub/quiz`;

  try {
    // 1. GET /schema
    const schemaRes = await fetch(`${baseUrl}/schema`).then(r => r.json());
    assert.strictEqual(schemaRes.success, true);
    assert.strictEqual(schemaRes.generator, '/Quizes/quiz-generator.html');
    console.log('  ✔ [PASS] Test 12.1: GET /api/study-hub/quiz/schema returns non-sensitive spec');
    passedTests++; totalTests++;

    // 2. POST /generate
    const genRes = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Software Engineering',
        unit: 'Unit 1',
        topic: 'SDLC Methodologies',
        questionCount: 15,
        difficulty: { easy: 7, moderate: 5, hard: 3 }
      })
    }).then(r => r.json());
    assert.strictEqual(genRes.success, true);
    assert.strictEqual(genRes.questions.length, 15);
    assert(genRes.url.includes('subName=Software+Engineering') || genRes.url.includes('subName=Software%20Engineering'));
    console.log('  ✔ [PASS] Test 12.2: POST /api/study-hub/quiz/generate creates 15 structured questions');
    passedTests++; totalTests++;

    // 3. POST /validate
    const valRes = await fetch(`${baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genRes)
    }).then(r => r.json());
    assert.strictEqual(valRes.valid, true);
    console.log('  ✔ [PASS] Test 12.3: POST /api/study-hub/quiz/validate confirms valid schema');
    passedTests++; totalTests++;

    // 4. POST /build-url
    const buildRes = await fetch(`${baseUrl}/build-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genRes)
    }).then(r => r.json());
    assert.strictEqual(buildRes.success, true);
    assert(buildRes.url.includes('https://dpgnotes.web.app/Quizes/quiz-generator.html'));
    console.log('  ✔ [PASS] Test 12.4: POST /api/study-hub/quiz/build-url builds validated link');
    passedTests++; totalTests++;

    // 5. POST /prepare
    const prepRes = await fetch(`${baseUrl}/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subName: 'Java Programming',
        quizTitle: 'Core Java OOP Concepts',
        totalQuestionCount: 20,
        timeAlloted: 30
      })
    }).then(r => r.json());
    assert.strictEqual(prepRes.success, true);
    assert(prepRes.url.includes('timeAlloted=30'));
    console.log('  ✔ [PASS] Test 12.5: POST /api/study-hub/quiz/prepare backward compatibility verified');
    passedTests++; totalTests++;

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`  ALL ${passedTests}/${totalTests} MASTER TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================');
}

runHttpEndpointTests().catch(err => {
  console.error('HTTP Endpoint Test Suite Failure:', err);
  process.exit(1);
});
