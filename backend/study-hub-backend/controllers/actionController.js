/** DPGNotes NOVA - Action Execution Controller */
const { validateActionRequest } = require('../../study-hub-allowlist/actionRegistry');
const { resolveUserContext } = require('../../study-hub-allowlist/permissions');
const { buildSafePlatformUrl } = require('../../study-hub-allowlist/navigationAllowlist');
const { buildValidatedQuizUrl } = require('../../study-hub-allowlist/quizAllowlist');
const { getParsedLegalDoc } = require('./legalController');
const { sanitizeDocData, isCollectionReadable } = require('../../study-hub-allowlist/firestoreAllowlist');
/**
 * Dispatches an approved action to its dedicated handler.
 */
async function executeAction(actionName, args, userContext, firestoreDb = null) {
  switch (actionName) {
    case 'search_resources': {
      const query = (args.query || '').trim();
      let tab = (args.tab || 'all').toLowerCase();
      if (tab === 'notes' || tab === 'papers') tab = 'all';
      const tag = args.tag || '';
      const queryParams = { q: query };
      if (tab && tab !== 'all') queryParams.tab = tab;
      if (tag) queryParams.tag = tag;
      const navResult = buildSafePlatformUrl('serp', queryParams);
      return {
        success: true,
        action: 'search_resources',
        query,
        tab,
        tag,
        url: navResult.url,
        message: `Found academic search query for '${query}'. Navigation destination prepared.`
      };
    }
    case 'generate_quiz_url': {
      const quizRes = buildValidatedQuizUrl(args);
      if (!quizRes.valid) {
        throw new Error(quizRes.error || 'Quiz parameter validation failed.');
      }
      return {
        success: true,
        action: 'generate_quiz_url',
        url: quizRes.url,
        summary: quizRes.summary,
        message: `Quiz URL prepared for '${quizRes.summary.quizTitle}'. Ready for Quiz Studio.`
      };
    }
    case 'get_legal_section': {
      const docId = args.documentId || 'privacy-policy';
      const doc = getParsedLegalDoc(docId);
      if (!doc) {
        throw new Error(`Legal document '${docId}' not found.`);
      }
      let relevantSections = doc.sections;
      if (args.sectionId) {
        const sLower = args.sectionId.toLowerCase();
        relevantSections = doc.sections.filter(s => s.heading.toLowerCase().includes(sLower));
      }
      return {
        success: true,
        action: 'get_legal_section',
        documentId: doc.id,
        title: doc.title,
        url: doc.url,
        sections: relevantSections.slice(0, 3)
      };
    }
    case 'query_academic_resources': {
      const q = (args.query || '').toLowerCase().trim();
      const limit = Math.min(args.limit || 5, 10);
      const matched = [];
      if (firestoreDb && isCollectionReadable('documents', userContext.role)) {
        try {
          const snap = await firestoreDb.collection('documents').limit(30).get();
          snap.forEach(docSnap => {
            const data = docSnap.data();
            const title = (data.title || '').toLowerCase();
            const cat = (data.category || '').toLowerCase();
            const disc = (data.discipline || '').toLowerCase();
            if (!q || title.includes(q) || cat.includes(q) || disc.includes(q)) {
              if (matched.length < limit) {
                const clean = sanitizeDocData({ id: docSnap.id, ...data });
                matched.push({
                  id: clean.id,
                  title: clean.title,
                  category: clean.category,
                  discipline: clean.discipline,
                  likes: Array.isArray(clean.likes) ? clean.likes.length : (clean.likes || 0),
                  pdfUrl: clean.pdfUrl
                });
              }
            }
          });
        } catch (dbErr) {
          console.warn('[Action Controller] Firestore read fallback:', dbErr.message);
        }
      }
      return {
        success: true,
        action: 'query_academic_resources',
        results: matched,
        count: matched.length,
        searchUrl: `/dpgnotes-serp.html?q=${encodeURIComponent(args.query || '')}`
      };
    }
    case 'get_contributor_telemetry': {
      const userId = args.userId;
      if (!userId) throw new Error('User ID is required for contributor telemetry.');
      if (userContext.role !== 'admin' && userContext.uid !== userId) {
        throw new Error('Unauthorized: You can only inspect your own contributor analytics.');
      }
      let count = 0;
      let likes = 0;
      let shares = 0;
      if (firestoreDb) {
        try {
          const snap = await firestoreDb.collection('documents').where('userId', '==', userId).get();
          count = snap.size;
          snap.forEach(d => {
            const data = d.data();
            likes += Array.isArray(data.likes) ? data.likes.length : 0;
            shares += data.shareCount || 0;
          });
        } catch (e) {
          console.warn('[Action Controller] Telemetry fetch error:', e.message);
        }
      }
      return {
        success: true,
        action: 'get_contributor_telemetry',
        userId,
        uploadedResources: count,
        accumulatedLikes: likes,
        sharesGenerated: shares,
        dashboardUrl: '/dashboard.html'
      };
    }
    case 'navigate_platform': {
      const navRes = buildSafePlatformUrl(args.destination, args.params);
      if (!navRes.allowed) {
        throw new Error(navRes.reason || 'Invalid navigation target.');
      }
      return {
        success: true,
        action: 'navigate_platform',
        url: navRes.url,
        destination: navRes.destination
      };
    }
    default:
      throw new Error(`Unsupported action: ${actionName}`);
  }
}
/**
 * Handler for POST /api/study-hub/actions/execute
 */
async function handleActionExecute(req, res) {
  try {
    const { action, arguments: args } = req.body;
    const adminAuth = req.app.get('firebaseAuth') || null;
    const firestoreDb = req.app.get('firestoreDb') || null;
    const userContext = await resolveUserContext(req, adminAuth);
    const validation = validateActionRequest(action, args, userContext);
    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        error: validation.error
      });
    }
    const result = await executeAction(action, args, userContext, firestoreDb);
    return res.json({
      success: true,
      action,
      result
    });
  } catch (err) {
    console.error('[Action Controller] Execution failure:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Action execution failed.'
    });
  }
}
module.exports = {
  handleActionExecute,
  executeAction
};
