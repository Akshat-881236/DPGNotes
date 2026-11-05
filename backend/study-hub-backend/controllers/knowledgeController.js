/** DPGNotes NOVA - Knowledge Trainee Controller */
const fs = require('fs');
const path = require('path');
const { LEGAL_DOCUMENTS } = require('../../study-hub-allowlist/legalAllowlist');
const { ALLOWED_DESTINATIONS } = require('../../study-hub-allowlist/navigationAllowlist');
let cachedKnowledge = null;
let lastKnowledgeScan = 0;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
function buildPlatformKnowledge() {
  const publicDir = path.resolve(__dirname, '..', '..', '..', 'public');
  const discoveredLegal = [];
  for (const [key, doc] of Object.entries(LEGAL_DOCUMENTS)) {
    discoveredLegal.push({
      id: key,
      title: doc.title,
      url: doc.path,
      topics: doc.topics
    });
  }
  const academicModules = [
    {
      discipline: 'Computer Science & Engineering',
      programs: ['BCA', 'B.Tech CSE', 'MCA', 'M.Tech'],
      subjects: [
        { name: 'Database Management Systems (DBMS)', code: 'BCA-302', topics: ['Relational Algebra', 'E-R Models', 'SQL Queries', '1NF, 2NF, 3NF, BCNF Normalization', 'ACID Transactions'] },
        { name: 'Computer Organization & Architecture (COA)', code: 'BCA-201', topics: ['Instruction Sets', 'Pipelining', 'Cache Mapping', 'ALU Design', 'Memory Hierarchy'] },
        { name: 'Operating Systems (OS)', code: 'BCA-401', topics: ['Process Scheduling', 'Deadlocks', 'Paging & Virtual Memory', 'File Systems', 'Semaphores'] },
        { name: 'Object-Oriented Programming with Java', code: 'BCA-304', topics: ['Inheritance', 'Polymorphism', 'Interfaces', 'Multithreading', 'AWT/Swing GUI'] },
        { name: 'Cloud Computing & Virtualization', code: 'BCA-603', topics: ['IaaS, PaaS, SaaS', 'Hypervisors', 'Serverless', 'AWS & Azure Architectures', 'Cloud Security'] },
        { name: 'Data Structures and Algorithms', code: 'BCA-202', topics: ['Arrays', 'Linked Lists', 'Binary Search Trees', 'Graphs', 'Sorting & Searching'] },
        { name: 'Software Engineering', code: 'BCA-501', topics: ['SDLC Models', 'Agile & Scrum', 'Testing Methodologies', 'UML Diagrams', 'Requirement Engineering'] }
      ]
    },
    {
      discipline: 'Physical Education & Sports Sciences',
      programs: ['B.A. Multidisciplinary', 'B.Sc Sports Science', 'B.P.Ed'],
      subjects: [
        { name: 'Health Education & Hygiene', code: 'PED-101', topics: ['Personal Hygiene', 'Nutritional Guidelines', 'Community Health', 'Posture Defects'] },
        { name: 'First Aid & Safety Management', code: 'PED-201', topics: ['Emergency Resuscitation (CPR)', 'Fracture Splinting', 'Sports Injury Rehabilitation', 'Wound Dressing'] },
        { name: 'Physical Fitness & Somatotyping', code: 'PED-301', topics: ['Ectomorph, Mesomorph, Endomorph', 'Cooper 12-Min Test', 'Cardiovascular Endurance', 'Strength Training'] }
      ]
    },
    {
      discipline: 'Career & Placement Readiness',
      programs: ['All Undergraduate & Postgraduate Batches'],
      subjects: [
        { name: 'Technical Placement & Coding Interviews', topics: ['Algorithm Challenges', 'System Design Basics', 'Mock Technical Rounds', 'Resume Building'] },
        { name: 'Quantitative Aptitude & Logical Reasoning', topics: ['Speed Math', 'Syllogisms', 'Data Interpretation', 'Puzzles'] }
      ]
    }
  ];
  return {
    platform: 'DPGNotes',
    assistant: 'DPGNotes NOVA',
    tagline: 'Chat, Search , Find',
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    features: {
      search: {
        destination: '/dpgnotes-serp.html',
        supportedParams: ['q', 'tab', 'tag', 'category', 'discipline'],
        supportedTabs: [
          { id: 'all', label: 'All Results' },
          { id: 'ai', label: 'AI Overview' },
          { id: 'website', label: 'Contributor Websites' },
          { id: 'videos', label: 'Masterclass Videos' },
          { id: 'solutions', label: 'Assignment & Practical Solutions' },
          { id: 'quizzes', label: 'Interactive Quizzes' },
          { id: 'contributors', label: 'Verified Contributors' }
        ]
      },
      quizStudio: {
        destination: '/Quizes/quiz-generator.html',
        allowedTimeMinutes: [15, 20, 30, 45, 60, 90, 120, 150, 180],
        maxQuestions: 100,
        supportedTypes: ['single', 'multiple', 'msq'],
        visibilityOptions: ['public', 'private'],
        requiresVerificationToPublish: true
      },
      coverPageGenerators: {
        assignment: '/AssignmentCoverPageGenerator/index.html',
        practical: '/PracticalCoverPageGenerator/index.html'
      },
      academicSolutions: {
        assignmentSolutions: '/AssignmentSolution/index.html',
        practicalSolutions: '/PracticalSolution/index.html'
      },
      contributorPortal: {
        dashboard: '/dashboard.html',
        profile: '/profile.html',
        adminPortal: '/admin.html'
      }
    },
    navigation: ALLOWED_DESTINATIONS,
    academicModules,
    legalDocuments: discoveredLegal,
    securityPolicies: {
      clientStorage: 'Strictly zero-retention ephemeral chat. No localStorage, IndexedDB, or Firestore transcript logging.',
      dataIntegrity: 'Authenticated AES-256 vault encryption and Firebase security rules protection.'
    }
  };
}
/**
 * Controller handler for GET /api/study-hub/knowledge
 */
async function getPlatformKnowledge(req, res) {
  try {
    const now = Date.now();
    if (!cachedKnowledge || (now - lastKnowledgeScan > CACHE_TTL_MS)) {
      cachedKnowledge = buildPlatformKnowledge();
      lastKnowledgeScan = now;
    }
    const { category, query } = req.query;
    if (category) {
      const catKey = String(category).toLowerCase().trim();
      if (cachedKnowledge.features[catKey]) {
        return res.json({
          success: true,
          category: catKey,
          data: cachedKnowledge.features[catKey]
        });
      }
      if (catKey === 'academic' || catKey === 'courses') {
        return res.json({
          success: true,
          category: 'academicModules',
          data: cachedKnowledge.academicModules
        });
      }
      if (catKey === 'legal') {
        return res.json({
          success: true,
          category: 'legalDocuments',
          data: cachedKnowledge.legalDocuments
        });
      }
    }
    if (query) {
      const q = String(query).toLowerCase().trim();
      const matchedModules = [];
      for (const disc of cachedKnowledge.academicModules) {
        const matchingSubs = disc.subjects.filter(s => 
          s.name.toLowerCase().includes(q) || 
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.topics.some(t => t.toLowerCase().includes(q))
        );
        if (matchingSubs.length) {
          matchedModules.push({ discipline: disc.discipline, subjects: matchingSubs });
        }
      }
      return res.json({
        success: true,
        query: q,
        academicMatches: matchedModules,
        searchEndpoint: `/dpgnotes-serp.html?q=${encodeURIComponent(q)}`
      });
    }
    return res.json({
      success: true,
      knowledgeVersion: cachedKnowledge.version,
      knowledge: cachedKnowledge
    });
  } catch (err) {
    console.error('[Knowledge Controller] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve DPGNotes knowledge repository.'
    });
  }
}
module.exports = {
  getPlatformKnowledge,
  buildPlatformKnowledge
};
