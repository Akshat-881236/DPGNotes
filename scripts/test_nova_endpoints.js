/** Comprehensive Automated Verification Suite for DPGNotes NOVA */
const express = require('../backend/node_modules/express');
const studyHubRouter = require('../backend/study-hub-backend/routers/studyHubRoutes');
const { validateActionRequest, ACTION_REGISTRY } = require('../backend/study-hub-allowlist/actionRegistry');
const { buildSafePlatformUrl } = require('../backend/study-hub-allowlist/navigationAllowlist');
const { buildValidatedQuizUrl } = require('../backend/study-hub-allowlist/quizAllowlist');
const { findRelevantLegalDoc, LEGAL_DOCUMENTS } = require('../backend/study-hub-allowlist/legalAllowlist');
async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('   DPGNotes NOVA - MASTER VERIFICATION TEST SUITE   ');
  console.log('====================================================\n');
  let passedCount = 0;
  let totalCount = 0;
  function assert(condition, testName) {
    totalCount++;
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✘ [FAIL] ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }
  console.log('Suite 1: Action Allowlist & Security Boundaries');
  assert(ACTION_REGISTRY.search_resources !== undefined, 'search_resources is registered in allowlist');
  assert(ACTION_REGISTRY.generate_quiz_url !== undefined, 'generate_quiz_url is registered in allowlist');
  assert(ACTION_REGISTRY.get_legal_section !== undefined, 'get_legal_section is registered in allowlist');
  const openRedirectAttempt = buildSafePlatformUrl('https://malicious-site.com/steal-data');
  assert(!openRedirectAttempt.allowed, 'Strictly rejects external URLs and prevents open redirects');
  const javascriptProtoAttempt = buildSafePlatformUrl('javascript:alert(1)');
  assert(!javascriptProtoAttempt.allowed, 'Strictly rejects javascript: protocol execution');
  const legitimateNav = buildSafePlatformUrl('serp', { q: 'Java' });
  assert(legitimateNav.allowed && legitimateNav.url === '/dpgnotes-serp.html?q=Java', 'Permits legitimate internal navigation to SERP');
  const quizAttempt = buildValidatedQuizUrl({
    subName: 'Operating Systems',
    quizTitle: 'Unit 2 Process Scheduling',
    timeMinutes: 45,
    questionCount: 20
  });
  assert(quizAttempt.valid && (quizAttempt.url.includes('timeAlloted=45') || quizAttempt.url.includes('timeMinutes=45')) && quizAttempt.url.includes('totalQuestionCount=20'), 'Generates valid parameter-based Quiz Studio URL');
  const privacyDocId = findRelevantLegalDoc('Can my information be shared in DPGNotes?');
  assert(privacyDocId === 'privacy-policy', 'Resolves user privacy questions to privacy-policy.html');
  const termsDocId = findRelevantLegalDoc('What happens if someone uploads copyrighted content?');
  assert(termsDocId === 'dmca-policy' || termsDocId === 'copyright-policy', 'Resolves copyright questions to copyright/DMCA policies');
  console.log('\nSuite 2: Express HTTP Endpoints Integration');
  const app = express();
  app.use(express.json());
  app.use('/api/study-hub', studyHubRouter);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/study-hub`;
  try {
    const health = await fetch(`${baseUrl}/health`).then(r => r.json());
    assert(health.status === 'healthy' && health.service.includes('DPGNotes NOVA'), 'GET /api/study-hub/health reports healthy service');
    const knowledge = await fetch(`${baseUrl}/knowledge`).then(r => r.json());
    assert(knowledge.success && knowledge.knowledge.features.search.destination === '/dpgnotes-serp.html', 'GET /api/study-hub/knowledge returns verified DPGNotes architecture');
    const legalRes = await fetch(`${baseUrl}/legal?documentId=terms-conditions`).then(r => r.json());
    assert(legalRes.success && legalRes.title && legalRes.sections.length > 0, 'GET /api/study-hub/legal parses live legal sections from HTML DOM');
    const quizRes = await fetch(`${baseUrl}/quiz/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subName: 'Software Engineering',
        quizTitle: 'SDLC & Agile Methodologies',
        questionCount: 15,
        timeMinutes: 30
      })
    }).then(r => r.json());
    assert(quizRes.success && quizRes.url && quizRes.url.includes('/Quizes/quiz-generator.html?'), 'POST /api/study-hub/quiz/prepare builds complete generator destination');
    const searchAction = await fetch(`${baseUrl}/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search_resources',
        arguments: { query: 'Cloud Computing', tab: 'all' }
      })
    }).then(r => r.json());
    assert(searchAction.success && searchAction.result.url === '/dpgnotes-serp.html?q=Cloud+Computing', 'POST /api/study-hub/actions/execute safely handles search_resources');
    const unauthAction = await fetch(`${baseUrl}/actions/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_contributor_telemetry',
        arguments: { userId: 'unauthorized_random_user_123' }
      })
    }).then(r => r.json());
    assert(!unauthAction.success && unauthAction.error.includes('Access Denied'), 'Strictly rejects unauthorized contributor telemetry requests from public users');
    console.log('\nSuite 3: Multi-Stage Agentic Reasoning');
    const academicChat = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Explain database normalization with examples.'
      })
    }).then(r => r.json());
    assert(academicChat.success && academicChat.message.length > 50, 'Conversational explanation on database normalization returned');
    const searchChat = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Find Cloud Computing notes for my semester.'
      })
    }).then(r => r.json());
    assert(searchChat.success && searchChat.actions.length > 0 && searchChat.actions[0].url.includes('dpgnotes-serp.html'), 'Two-stage search intent execution returns action cards with SERP URL');
    const quizChat = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I need 15 MCQs on Software Engineering Unit 1.'
      })
    }).then(r => r.json());
    assert(quizChat.success && quizChat.actions.length > 0 && quizChat.actions[0].url.includes('quiz-generator.html'), 'Two-stage quiz intent execution returns action cards with Quiz Studio URL');
  } finally {
    server.close();
  }
  console.log('\n====================================================');
  console.log(`  ALL ${passedCount}/${totalCount} MASTER TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}
runComprehensiveTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
