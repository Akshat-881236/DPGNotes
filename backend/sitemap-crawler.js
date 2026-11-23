/**
 * DPGNotes Dedicated 24/7 Sitemap & Catalog Deep Crawler (sitemap-crawler.js)
 * 
 * Runs continuously on the Render backend server in 6-hour intervals.
 * Deep crawls all Firestore collections:
 *   - users (Verified Contributors with genuine names, emails, roles, profile URLs)
 *   - documents (PDF Educational Resources with real IDs, titles, descriptions, categories, tags)
 *   - solutions (Assignment Solutions & Practical Lab Solutions via collectionGroup)
 *   - quizDirectory (Academic Quizzes & Examinations with question counts & tags)
 * 
 * Exposes live API endpoints for frontend site-map-nav.js and search crawlers:
 *   - GET  /api/sitemap/live-catalog
 *   - GET  /api/sitemap/jsonld
 *   - POST /api/sitemap/crawl-now
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

const CRAWL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Hours
const CACHE_FILE_PATH = path.join(__dirname, 'crawled_firestore_sitemap.json');

let liveCache = {
  crawledAt: null,
  contributors: [],
  pdfResources: [],
  assignmentSolutions: [],
  practicalSolutions: [],
  quizzes: []
};

// Seed initial memory cache from disk if available
try {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const diskData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
    if (diskData && diskData.pdfResources) {
      liveCache = diskData;
      console.log('[SitemapCrawler] Seeded initial cache from disk. Total resources:', 
        (liveCache.pdfResources.length + liveCache.assignmentSolutions.length + liveCache.practicalSolutions.length + liveCache.quizzes.length));
    }
  }
} catch (e) {
  console.warn('[SitemapCrawler] Failed to read disk cache:', e.message);
}

/**
 * Perform a deep crawl of Firestore data
 */
async function performDeepCrawl(db) {
  if (!db) {
    throw new Error('Firestore DB instance is not initialized');
  }

  console.log('[SitemapCrawler] Starting 24/7 Firestore deep catalog crawl...');
  const startTime = Date.now();

  const crawled = {
    crawledAt: new Date().toISOString(),
    contributors: [],
    pdfResources: [],
    assignmentSolutions: [],
    practicalSolutions: [],
    quizzes: []
  };

  // 1. Crawl Users / Contributors
  try {
    const usersSnap = await db.collection('users').get();
    const seenUids = new Set();
    usersSnap.forEach(doc => {
      const d = doc.data();
      const uid = doc.id;
      const isContrib = d.role === 'contributor' || d.isContributor || (d.email && d.email.includes('akshat')) || (d.uploadedDocsCount && d.uploadedDocsCount > 0);
      if ((isContrib || uid.length > 15) && !seenUids.has(uid)) {
        seenUids.add(uid);
        const name = d.name || d.displayName || d.username || (d.email ? d.email.split('@')[0] : 'Verified Contributor');
        crawled.contributors.push({
          uid: uid,
          name: name,
          email: d.email || '',
          avatar: d.avatar || d.photoURL || '',
          role: d.email === 'its.akshatnetworkhub23@gmail.com' ? 'Platform Administrator & Lead Contributor' : (d.role || 'Verified Contributor'),
          profileUrl: 'https://dpgnotes.web.app/profile.html?uid=' + encodeURIComponent(uid)
        });
      }
    });
  } catch (err) {
    console.error('[SitemapCrawler] Error crawling users:', err.message);
  }

  // 2. Crawl PDF Documents
  try {
    const docsSnap = await db.collection('documents').get();
    const seenDocIds = new Set();
    docsSnap.forEach(doc => {
      const d = doc.data();
      const docId = d.documentId || doc.id;
      if (docId && !seenDocIds.has(docId)) {
        seenDocIds.add(docId);
        crawled.pdfResources.push({
          id: docId,
          title: d.title || 'Academic Educational Resource',
          subject: d.discipline || d.subject || 'General Academic',
          category: d.category || 'Notes',
          description: d.description || ('Verified university study notes for ' + (d.discipline || d.subject || 'students') + '.'),
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
          uploader: d.userName || d.uploader || d.uploaderEmail || 'Verified Contributor',
          uploaderEmail: d.uploaderEmail || '',
          url: 'https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=' + encodeURIComponent(docId)
        });
      }
    });
  } catch (err) {
    console.error('[SitemapCrawler] Error crawling documents:', err.message);
  }

  // 3. Crawl Solutions (Practical & Assignment)
  try {
    const solSnap = await db.collectionGroup('solutions').get();
    const seenSolIds = new Set();
    solSnap.forEach(doc => {
      const d = doc.data();
      const solId = d.id || doc.id;
      if (!solId || seenSolIds.has(solId)) return;
      seenSolIds.add(solId);

      const path = doc.ref.path;
      const isPractical = path.includes('practical_solutions') || (solId && solId.startsWith('prac_'));
      const item = {
        id: solId,
        title: d.subjectName ? (d.subjectName + ' (' + (d.course || d.subjectCode || 'Solution') + ')') : (d.subjectCode || 'Academic Solution'),
        subject: d.subjectName || d.subjectCode || 'Academic Course',
        course: d.course || d.courseSec || 'University Course',
        contributorUid: d.contributorUid || '',
        contributorName: d.studentName || d.contributorName || 'Verified Contributor',
        contributorEmail: d.contributorEmail || d.uploaderEmail || '',
        description: isPractical 
          ? ('Verified practical lab experiments, algorithms, and source code for ' + (d.subjectName || solId) + '.')
          : ('Verified academic assignment solution with questions and step-by-step answers for ' + (d.subjectName || solId) + '.'),
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || (d.subjectCode + ', ' + (d.course || ''))),
        url: isPractical 
          ? ('https://dpgnotes.web.app/PracticalSolution/index.html?id=' + encodeURIComponent(solId))
          : ('https://dpgnotes.web.app/AssignmentSolution/index.html?id=' + encodeURIComponent(solId))
      };

      if (isPractical) {
        crawled.practicalSolutions.push(item);
      } else {
        crawled.assignmentSolutions.push(item);
      }
    });
  } catch (err) {
    console.error('[SitemapCrawler] Error crawling solutions:', err.message);
  }

  // 4. Crawl Quizzes
  try {
    const qzSnap = await db.collection('quizDirectory').get();
    const seenQuizIds = new Set();
    qzSnap.forEach(doc => {
      const d = doc.data();
      const qzId = d.quizId || doc.id;
      if (qzId && !seenQuizIds.has(qzId)) {
        seenQuizIds.add(qzId);
        crawled.quizzes.push({
          id: qzId,
          title: d.title || 'Online Academic Examination',
          subject: d.subjectCode || d.subjectName || 'Academic Assessment',
          ownerName: d.ownerName || 'Verified Educator',
          ownerUid: d.ownerUid || '',
          totalQuestions: d.totalQuestions || 0,
          description: d.description || ('Online examination and subject assessment on ' + (d.title || qzId) + '.'),
          tags: Array.isArray(d.topicTags) ? d.topicTags.join(', ') : (d.topicTags || d.tags || ''),
          url: 'https://dpgnotes.web.app/Quizes/index.html?quizId=' + encodeURIComponent(qzId)
        });
      }
    });
  } catch (err) {
    console.error('[SitemapCrawler] Error crawling quizzes:', err.message);
  }

  // Update live memory cache
  liveCache = crawled;

  // Persist to disk
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(crawled, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SitemapCrawler] Failed to write cache file to disk:', err.message);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[SitemapCrawler] Deep crawl completed in ${durationSec}s! Live catalog stats:`);
  console.log(` - Contributors: ${crawled.contributors.length}`);
  console.log(` - PDF Resources: ${crawled.pdfResources.length}`);
  console.log(` - Practical Solutions: ${crawled.practicalSolutions.length}`);
  console.log(` - Assignment Solutions: ${crawled.assignmentSolutions.length}`);
  console.log(` - Quizzes: ${crawled.quizzes.length}`);

  return crawled;
}

/**
 * Generate complete Schema.org JSON-LD graph from live catalog
 */
function generateJsonLdGraph() {
  const itemListElements = [];
  let position = 1;

  // Core navigation items
  const coreHubs = [
    { name: "DPGNotes Academic Portal", url: "https://dpgnotes.web.app/", desc: "Verified academic notes, university question papers, and educational resources." },
    { name: "DPGNotes Study Hub", url: "https://dpgnotes.web.app/study-hub.html", desc: "Central repository of semester notes, syllabus, and study materials." },
    { name: "DPGNotes Search Engine", url: "https://dpgnotes.web.app/dpgnotes-search-engine.html", desc: "Search university notes, solutions, and lab practicals." },
    { name: "DPGNotes SERP", url: "https://dpgnotes.web.app/dpgnotes-serp.html", desc: "Search Engine Results Page for academic resources and solutions." },
    { name: "Assignment Solutions Hub", url: "https://dpgnotes.web.app/AssignmentSolution/index.html", desc: "Verified university assignment solutions with step-by-step answers." },
    { name: "Practical Lab Solutions Hub", url: "https://dpgnotes.web.app/PracticalSolution/index.html", desc: "Lab manuals, source code, and interactive execution sandboxes." },
    { name: "Quiz & Examination Engine", url: "https://dpgnotes.web.app/Quizes/index.html", desc: "Online assessments, subject quizzes, and timed mock tests." }
  ];

  coreHubs.forEach(hub => {
    itemListElements.push({
      "@type": "SiteNavigationElement",
      "position": position++,
      "name": hub.name,
      "url": hub.url,
      "description": hub.desc
    });
  });

  // Contributors
  (liveCache.contributors || []).forEach(c => {
    itemListElements.push({
      "@type": "Person",
      "position": position++,
      "name": c.name,
      "url": c.profileUrl,
      "jobTitle": c.role,
      "email": c.email || undefined
    });
  });

  // PDF Resources
  (liveCache.pdfResources || []).forEach(r => {
    itemListElements.push({
      "@type": "DigitalDocument",
      "position": position++,
      "name": r.title,
      "url": r.url,
      "description": r.description,
      "keywords": r.tags,
      "about": r.subject
    });
  });

  // Practical Solutions
  (liveCache.practicalSolutions || []).forEach(p => {
    itemListElements.push({
      "@type": "TechArticle",
      "position": position++,
      "name": p.title,
      "url": p.url,
      "description": p.description,
      "keywords": p.tags,
      "author": { "@type": "Person", "name": p.contributorName }
    });
  });

  // Assignment Solutions
  (liveCache.assignmentSolutions || []).forEach(a => {
    itemListElements.push({
      "@type": "Article",
      "position": position++,
      "name": a.title,
      "url": a.url,
      "description": a.description,
      "keywords": a.tags,
      "author": { "@type": "Person", "name": a.contributorName }
    });
  });

  // Quizzes
  (liveCache.quizzes || []).forEach(q => {
    itemListElements.push({
      "@type": "Quiz",
      "position": position++,
      "name": q.title,
      "url": q.url,
      "description": q.description,
      "keywords": q.tags,
      "educationalLevel": "University / College"
    });
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://dpgnotes.web.app/#website",
        "url": "https://dpgnotes.web.app/",
        "name": "DPGNotes",
        "description": "Verified Academic Notes, University Question Papers, Assignment Solutions, Practical Lab Files & Quizzes",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://dpgnotes.web.app/dpgnotes-serp.html?tag={search_term_string}&tab=all",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        "@id": "https://dpgnotes.web.app/#catalog",
        "name": "DPGNotes Master Academic Navigation & Resources",
        "itemListElement": itemListElements
      }
    ]
  };
}

/**
 * Express router for sitemap endpoints
 */
function createSitemapRouter(db) {
  const router = express.Router();

  // GET live catalog
  router.get('/live-catalog', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    return res.json({
      status: 'success',
      crawledAt: liveCache.crawledAt,
      counts: {
        contributors: liveCache.contributors.length,
        pdfResources: liveCache.pdfResources.length,
        assignmentSolutions: liveCache.assignmentSolutions.length,
        practicalSolutions: liveCache.practicalSolutions.length,
        quizzes: liveCache.quizzes.length,
        totalResources: (liveCache.pdfResources.length + liveCache.assignmentSolutions.length + liveCache.practicalSolutions.length + liveCache.quizzes.length)
      },
      data: liveCache
    });
  });

  // GET JSON-LD schema
  router.get('/jsonld', (req, res) => {
    res.setHeader('Content-Type', 'application/ld+json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(generateJsonLdGraph());
  });

  // POST trigger on-demand crawl
  router.post('/crawl-now', async (req, res) => {
    try {
      const result = await performDeepCrawl(db);
      return res.json({ status: 'success', crawledAt: result.crawledAt });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  return router;
}

/**
 * Initialize 24/7 background scheduler and mount API routes
 */
function initSitemapCrawlerService(app, db) {
  if (app) {
    const router = createSitemapRouter(db);
    app.use('/api/sitemap', router);
    console.log('[SitemapCrawler] Routes mounted at /api/sitemap (live-catalog, jsonld, crawl-now)');
  }

  // Initial crawl on boot (with 5-second graceful deferral so database connections settle)
  setTimeout(() => {
    if (db) {
      performDeepCrawl(db).catch(err => {
        console.error('[SitemapCrawler] Boot crawl error:', err.message);
      });
    }
  }, 5000);

  // 6-hour interval continuous 24*7 scheduler
  setInterval(() => {
    if (db) {
      performDeepCrawl(db).catch(err => {
        console.error('[SitemapCrawler] 6-hour scheduler error:', err.message);
      });
    }
  }, CRAWL_INTERVAL_MS);

  console.log(`[SitemapCrawler] 24*7 crawler scheduler active (running every 6 hours: ${CRAWL_INTERVAL_MS}ms)`);
}

module.exports = {
  initSitemapCrawlerService,
  createSitemapRouter,
  performDeepCrawl,
  generateJsonLdGraph,
  getLiveCache: () => liveCache
};
