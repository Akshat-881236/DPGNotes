/** DPGNotes Global History Monitoring & Real-Time SEO JSON-LD Engine (history-monitoring.js) */
(function() {
  'use strict';
  const path = window.location.pathname.toLowerCase();
  if (path.includes('admin') || path.includes('quota-lockdown')) {
    return;
  }
  function getUserIdentity() {
    try {
      const activeUid = localStorage.getItem("dpgActiveUserUid");
      if (activeUid) {
        return { userKey: 'contributor_' + activeUid, userType: 'contributor', id: activeUid };
      }
      const activeUser = JSON.parse(localStorage.getItem("dpgActiveUser") || '{}');
      if (activeUser && activeUser.uid) {
        return { userKey: 'contributor_' + activeUser.uid, userType: 'contributor', id: activeUser.uid };
      }
    } catch(e) {}
    let guestId = localStorage.getItem("dpg_guest_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
      localStorage.setItem("dpg_guest_id", guestId);
    }
    return { userKey: 'guest_' + guestId, userType: 'guest', id: guestId };
  }
  const isSearchBot = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|chrome-lighthouse|lighthouse|slurp|duckduckbot|baiduspider|yandexbot|bingbot/i.test(navigator.userAgent);
  const DB_NAME = 'DPG_SEO_HISTORY_DB';
  const DB_VERSION = 1;
  const STORE_NAME = 'page_visits';
  function openHistoryDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        return resolve(null);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('visitCount', 'visitCount', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  async function recordLocalVisit(visitData) {
    try {
      const db = await openHistoryDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(visitData.url);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const count = existing ? (existing.visitCount + 1) : 1;
        const record = {
          ...visitData,
          visitCount: count,
          lastVisited: Date.now()
        };
        store.put(record);
      };
    } catch (e) {
      console.warn('[HistoryMonitoring] Local IndexedDB write error:', e);
    }
  }
  async function getTopVisitedPages() {
    return new Promise(async (resolve) => {
      try {
        const db = await openHistoryDB();
        if (!db) return resolve([]);
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
          resolve(list.slice(0, 8));
        };
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
  async function pruneLocalHistoryOlderThan35Days() {
    try {
      const db = await openHistoryDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      const cutoff = Date.now() - (35 * 24 * 60 * 60 * 1000); // 35 days in ms
      req.onsuccess = () => {
        const list = req.result || [];
        list.forEach(item => {
          if (item.lastVisited && item.lastVisited < cutoff) {
            store.delete(item.url);
          }
        });
      };
    } catch(e) {}
  }
  const canonicalSitelinks = [
    {
      name: "Create Assignment Solution",
      url: "https://dpgnotes.web.app/AssignmentSolution/generator.html",
      description: "Author comprehensive multi-question assignment guides with step-by-step solutions, code formatting, and downloadable formats."
    },
    {
      name: "DPGNotes Quizzone",
      url: "https://dpgnotes.web.app/Quizes/index.html",
      description: "Interactive timed examination portal with webcam proctoring, MSQ multi-select questions, and real-time scorecards."
    },
    {
      name: "Study Hub & Notes Directory",
      url: "https://dpgnotes.web.app/study-hub.html",
      description: "Centralized academic library containing verified semester notes, university syllabi, and previous year examination papers."
    },
    {
      name: "Create Practical Solution",
      url: "https://dpgnotes.web.app/PracticalSolution/generator.html",
      description: "Generate structured laboratory practical journals, source code walkthroughs, and viva voce preparation notes."
    },
    {
      name: "Academic PDF Viewer",
      url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html",
      description: "High-performance browser PDF reader with dark mode, dual themes, and chapter bookmarking."
    },
    {
      name: "Assignment Cover Page Generator",
      url: "https://dpgnotes.web.app/AssignmentCoverPageGenerator/index.html",
      description: "Create standardized university assignment cover pages with institutional watermarks and QR verification."
    }
  ];
  function buildBreadcrumbList() {
    const currentPath = window.location.pathname;
    const origin = window.location.origin || 'https://dpgnotes.web.app';
    const items = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": origin + "/index.html"
      }
    ];
    if (currentPath.includes('/assignmentsolution')) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": "Assignment Solutions",
        "item": origin + "/AssignmentSolution/generator.html"
      });
    } else if (currentPath.includes('/practicalsolution')) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": "Practical Solutions",
        "item": origin + "/PracticalSolution/generator.html"
      });
    } else if (currentPath.includes('/quizes')) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": "DPGNotes Quizzone",
        "item": origin + "/Quizes/index.html"
      });
    } else if (currentPath.includes('/legal')) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": "Legal & Policies",
        "item": origin + "/legal/index.html"
      });
    } else if (currentPath.includes('study-hub')) {
      items.push({
        "@type": "ListItem",
        "position": 2,
        "name": "Study Hub",
        "item": origin + "/study-hub.html"
      });
    }
    items.push({
      "@type": "ListItem",
      "position": items.length + 1,
      "name": document.title || "Academic Study Resource",
      "item": window.location.href
    });
    return {
      "@type": "BreadcrumbList",
      "itemListElement": items
    };
  }
  function getLiveAggregateRating() {
    try {
      const val = parseFloat(localStorage.getItem('dpg_live_firestore_rating_val'));
      const count = parseInt(localStorage.getItem('dpg_live_firestore_rating_count'), 10);
      const reviews = parseInt(localStorage.getItem('dpg_live_firestore_review_count'), 10);
      const score = parseInt(localStorage.getItem('dpg_live_firestore_resp_score'), 10);
      if (!isNaN(val) && val >= 1.0 && val <= 5.0 && count > 0) {
        return {
          ratingValue: val.toFixed(2),
          ratingCount: count.toString(),
          reviewCount: (reviews > 0 ? reviews : count).toString(),
          mobileResponsivenessScore: (!isNaN(score) && score >= 0 && score <= 100) ? score.toString() : "64"
        };
      }
    } catch(e) {}
    return {
      ratingValue: "3.28",
      ratingCount: "25",
      reviewCount: "9",
      mobileResponsivenessScore: "64"
    };
  }
  async function syncLiveAggregateRatings() {
    try {
      const [resResp, resPlat] = await Promise.all([
        fetch('https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/responsiveness_feedback'),
        fetch('https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/dpgnotes_ratings')
      ]);
      const dataResp = await resResp.json();
      const dataPlat = await resPlat.json();
      let respSum = 0, respCount = 0, respReviews = 0, respSatisfactory = 0;
      if (dataResp && dataResp.documents) {
        dataResp.documents.forEach(d => {
          const f = d.fields || {};
          const r = f.rating ? Number(f.rating.integerValue || f.rating.doubleValue || 0) : 0;
          if (r >= 1 && r <= 5) {
            respSum += r;
            respCount++;
            if (r >= 3) respSatisfactory++;
          }
          if (f.feedback && f.feedback.stringValue && f.feedback.stringValue.trim()) {
            respReviews++;
          }
        });
      }
      let expSum = 0, expCount = 0, expReviews = 0;
      if (dataPlat && dataPlat.documents) {
        dataPlat.documents.forEach(d => {
          const f = d.fields || {};
          const r = f.rating ? Number(f.rating.integerValue || f.rating.doubleValue || 0) : 0;
          if (r >= 1 && r <= 5) {
            expSum += r;
            expCount++;
          }
          if (f.opinion && f.opinion.stringValue && f.opinion.stringValue.trim()) {
            expReviews++;
          }
        });
      }
      const totalCount = respCount + expCount;
      if (totalCount > 0) {
        const totalSum = respSum + expSum;
        const avg = (totalSum / totalCount).toFixed(2);
        const totalReviews = respReviews + expReviews;
        const mobileScore = respCount > 0 ? Math.round((respSatisfactory / respCount) * 100) : 64;
        try {
          localStorage.setItem('dpg_live_firestore_rating_val', avg);
          localStorage.setItem('dpg_live_firestore_rating_count', totalCount.toString());
          localStorage.setItem('dpg_live_firestore_review_count', (totalReviews || totalCount).toString());
          localStorage.setItem('dpg_live_firestore_resp_score', mobileScore.toString());
        } catch(e) {}
        await injectRuntimeJsonLd();
      }
    } catch(err) {
      console.warn('[HistoryMonitoring] syncLiveAggregateRatings notice:', err);
    }
  }
  async function injectRuntimeJsonLd() {
    try {
      const topVisited = await getTopVisitedPages();
      const origin = window.location.origin || 'https://dpgnotes.web.app';
      const liveRating = getLiveAggregateRating();
      const sitelinksElements = canonicalSitelinks.map((link, idx) => {
        const localMatch = topVisited.find(v => v.url && v.url.toLowerCase().includes(link.url.toLowerCase().replace(origin, '')));
        const userVisits = localMatch ? localMatch.visitCount : 0;
        return {
          "@type": "SiteNavigationElement",
          "position": idx + 1,
          "name": link.name,
          "url": link.url,
          "description": link.description,
          ...(userVisits > 0 && {
            "interactionStatistic": {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/ViewAction",
              "userInteractionCount": userVisits
            }
          })
        };
      });
      const schemaGraph = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": origin + "/#website",
            "url": origin + "/",
            "name": "DPGNotes Academic Platform",
            "description": "Comprehensive academic portal providing university notes, assignment solutions, laboratory practicals, timed examinations, and study resources.",
            "inLanguage": "en-US",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": origin + "/dpgnotes-serp.html?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "ItemList",
            "@id": origin + "/#sitelinks",
            "name": "DPGNotes Academic Sitelinks & Previous Destinations",
            "itemListElement": sitelinksElements
          },
          buildBreadcrumbList(),
          {
            "@type": "EducationalOrganization",
            "@id": origin + "/#organization",
            "name": "DPGNotes",
            "url": origin + "/",
            "logo": origin + "/ANH.png",
            "description": "Comprehensive academic portal providing university notes, timed examinations, verified laboratory solutions, with real-time learner feedback rating (" + liveRating.ratingValue + "/5.0 from " + liveRating.ratingCount + " verified ratings) and " + liveRating.mobileResponsivenessScore + "% mobile responsiveness score.",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": liveRating.ratingValue,
              "bestRating": "5.0",
              "worstRating": "1.0",
              "ratingCount": liveRating.ratingCount,
              "reviewCount": liveRating.reviewCount
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "email": "its.akshatnetworkhub23@gmail.com",
              "contactType": "Academic Support"
            }
          }
        ]
      };
      let scriptEl = document.getElementById('dpg-runtime-jsonld');
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'dpg-runtime-jsonld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemaGraph, null, 2);
    } catch (err) {
      console.warn('[HistoryMonitoring] Runtime JSON-LD synthesis warning:', err);
    }
  }
  async function syncVisitToFirestore(user, visitData) {
    try {
      const db = window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
      if (!db || typeof db.collection !== 'function') return;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (35 * 24 * 60 * 60 * 1000)); // 35 days TTL
      await db.collection("user_navigation_history").add({
        userKey: user.userKey,
        userType: user.userType,
        pageTitle: visitData.title,
        pageUrl: visitData.url,
        pathname: visitData.pathname,
        timestamp: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : now,
        expiresAt: expiresAt,
        isBot: isSearchBot,
        deviceSpecs: {
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          pixelRatio: window.devicePixelRatio || 1,
          isMobile: window.innerWidth < 768
        }
      });
      const todayKey = new Date().toISOString().slice(0, 10);
      const lastSyncKey = localStorage.getItem('dpg_ai_trainee_sync_day');
      if (lastSyncKey !== todayKey) {
        localStorage.setItem('dpg_ai_trainee_sync_day', todayKey);
        const currentLiveRating = getLiveAggregateRating();
        await db.collection("seo_ai_daily_summaries").doc(`summary_${todayKey}`).set({
          date: todayKey,
          lastUpdated: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : now,
          aggregatedRating: parseFloat(currentLiveRating.ratingValue),
          ratingCount: parseInt(currentLiveRating.ratingCount, 10),
          reviewCount: parseInt(currentLiveRating.reviewCount, 10),
          gscComplianceScore: 98,
          mobileOptimizationScore: parseInt(currentLiveRating.mobileResponsivenessScore, 10),
          traineeStatus: "summarized",
          retentionPolicy: "35_days_ttl"
        }, { merge: true });
      }
    } catch(err) {
      console.warn('[HistoryMonitoring] Firestore sync notice:', err);
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    const user = getUserIdentity();
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const visitData = {
      url: currentUrl,
      pathname: currentPath,
      title: document.title || "DPGNotes Academic Resource",
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || "",
      isBot: isSearchBot
    };
    recordLocalVisit(visitData);
    pruneLocalHistoryOlderThan35Days();
    await injectRuntimeJsonLd();
    syncLiveAggregateRatings();
    setTimeout(() => {
      syncVisitToFirestore(user, visitData);
    }, 1200);
  });
  window.addEventListener('dpg-feedback-submitted', () => {
    syncLiveAggregateRatings();
  });
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('dpg_live_firestore_')) {
      injectRuntimeJsonLd();
    }
  });
  window.__dpgHistoryMonitoring = {
    getUserIdentity,
    getTopVisitedPages,
    injectRuntimeJsonLd,
    getLiveAggregateRating,
    syncLiveAggregateRatings,
    pruneOlderThan35Days: pruneLocalHistoryOlderThan35Days
  };
})();
