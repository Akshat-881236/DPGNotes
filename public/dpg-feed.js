/** DPGNotes Feed & Interaction Tracking Engine (dpg-feed.js) */
(function() {
  const DB_NAME = "dpg_feed_db";
  const DB_VERSION = 1;
  const STORE_INTERACTIONS = "interactions";
  const STORE_COOKIES = "cookies_store";
  let dbInstance = null;
  function openDB() {
    return new Promise((resolve) => {
      if (dbInstance) return resolve(dbInstance);
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported by client environment");
        return resolve(null);
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_INTERACTIONS)) {
          const store = db.createObjectStore(STORE_INTERACTIONS, { keyPath: "id", autoIncrement: true });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_COOKIES)) {
          db.createObjectStore(STORE_COOKIES, { keyPath: "key" });
        }
      };
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onerror = (e) => {
        console.warn("IndexedDB open error:", e);
        resolve(null);
      };
    });
  }
  function getClientDeviceId() {
    let id = localStorage.getItem("dpg_client_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("dpg_client_device_id", id);
    }
    return id;
  }
  async function logPdfVisit(docInfo) {
    if (!docInfo) return;
    try {
      const db = await openDB();
      const entry = {
        type: "pdf_visit",
        docId: docInfo.id || docInfo.docId || "",
        title: docInfo.title || "",
        category: docInfo.category || "",
        discipline: docInfo.discipline || "",
        tags: docInfo.tags || "",
        timestamp: Date.now()
      };
      if (db) {
        const tx = db.transaction(STORE_INTERACTIONS, "readwrite");
        tx.objectStore(STORE_INTERACTIONS).add(entry);
      }
      if (docInfo.discipline) {
        document.cookie = `dpg_pref_discipline=${encodeURIComponent(docInfo.discipline)}; path=/; max-age=2592000; SameSite=Lax`;
      }
      if (docInfo.category) {
        document.cookie = `dpg_pref_category=${encodeURIComponent(docInfo.category)}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } catch (e) {
      console.warn("logPdfVisit failed:", e);
    }
  }
  async function logSerpSearch(queryStr) {
    if (!queryStr || !queryStr.trim()) return;
    const q = queryStr.trim();
    try {
      const db = await openDB();
      const entry = {
        type: "serp_search",
        query: q,
        timestamp: Date.now()
      };
      if (db) {
        const tx = db.transaction(STORE_INTERACTIONS, "readwrite");
        tx.objectStore(STORE_INTERACTIONS).add(entry);
      }
      document.cookie = `dpg_last_query=${encodeURIComponent(q)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch (e) {
      console.warn("logSerpSearch failed:", e);
    }
  }
  async function getUserFeedWeights() {
    const weights = {
      disciplines: {},
      categories: {},
      keywords: new Set()
    };
    const cookies = document.cookie.split(";");
    cookies.forEach(c => {
      const [k, v] = c.split("=").map(s => s.trim());
      if (k === "dpg_pref_discipline" && v) {
        const disc = decodeURIComponent(v);
        weights.disciplines[disc] = (weights.disciplines[disc] || 0) + 3;
      }
      if (k === "dpg_pref_category" && v) {
        const cat = decodeURIComponent(v);
        weights.categories[cat] = (weights.categories[cat] || 0) + 3;
      }
      if (k === "dpg_last_query" && v) {
        const q = decodeURIComponent(v).toLowerCase();
        q.split(/\s+/).forEach(w => { if (w.length > 2) weights.keywords.add(w); });
      }
    });
    try {
      const db = await openDB();
      if (db) {
        const events = await new Promise((resolve) => {
          const tx = db.transaction(STORE_INTERACTIONS, "readonly");
          const req = tx.objectStore(STORE_INTERACTIONS).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
        const recent = events.slice(-35);
        recent.forEach(evt => {
          if (evt.type === "pdf_visit") {
            if (evt.discipline) {
              weights.disciplines[evt.discipline] = (weights.disciplines[evt.discipline] || 0) + 2;
            }
            if (evt.category) {
              weights.categories[evt.category] = (weights.categories[evt.category] || 0) + 2;
            }
            if (evt.title) {
              evt.title.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 3) weights.keywords.add(w); });
            }
          } else if (evt.type === "serp_search" && evt.query) {
            evt.query.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 2) weights.keywords.add(w); });
          }
        });
      }
    } catch (e) {
      console.warn("getUserFeedWeights reading error:", e);
    }
    return weights;
  }
  function scoreResource(item, weights) {
    if (!item) return 0;
    let score = 0;
    const disc = item.discipline || "";
    const cat = item.category || "";
    const title = (item.title || "").toLowerCase();
    const tags = (Array.isArray(item.tags) ? item.tags.join(" ") : (item.tags || "")).toLowerCase();
    if (disc && weights.disciplines[disc]) {
      score += weights.disciplines[disc] * 5;
    }
    if (cat && weights.categories[cat]) {
      score += weights.categories[cat] * 4;
    }
    if (weights.keywords && weights.keywords.size > 0) {
      weights.keywords.forEach(kw => {
        if (title.includes(kw)) score += 6;
        if (tags.includes(kw)) score += 3;
      });
    }
    if (item.likes && Array.isArray(item.likes)) {
      score += item.likes.length * 0.5;
    }
    if (item.sharesCount) {
      score += item.sharesCount * 0.5;
    }
    if (item.createdAt) {
      const ts = item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt;
      const daysOld = Math.max(1, (Date.now() - ts) / (1000 * 3600 * 24));
      score += Math.max(0, 10 - daysOld * 0.2);
    }
    return score;
  }
  async function dailySyncToFirestore(firestoreDb, currentUser, setDocFn, docFn, serverTimestampFn) {
    if (!firestoreDb || !setDocFn || !docFn) return;
    try {
      const isBot = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|lighthouse/i.test(navigator.userAgent);
      if (isBot) return;
      const todayStr = new Date().toISOString().split("T")[0];
      const lastSync = localStorage.getItem("dpg_last_feed_sync");
      if (lastSync === todayStr) {
        return; // Already synced today
      }
      const clientId = (currentUser && currentUser.uid) ? currentUser.uid : getClientDeviceId();
      const feedWeights = await getUserFeedWeights();
      const serializedKeywords = Array.from(feedWeights.keywords || []);
      let attribution = null;
      try {
        if (window.dpgAttribution && typeof window.dpgAttribution.get === 'function') {
          attribution = window.dpgAttribution.get();
        } else {
          attribution = JSON.parse(sessionStorage.getItem("dpg_attribution") || localStorage.getItem("dpg_attribution_last") || "null");
        }
      } catch(e) {}
      const payload = {
        clientId: clientId,
        userId: currentUser ? currentUser.uid : null,
        userEmail: currentUser ? currentUser.email : null,
        disciplines: feedWeights.disciplines,
        categories: feedWeights.categories,
        keywords: serializedKeywords,
        cookiesRaw: document.cookie,
        attribution: attribution || null,
        lastSyncDate: todayStr,
        updatedAt: serverTimestampFn ? serverTimestampFn() : new Date()
      };
      await setDocFn(docFn(firestoreDb, "user_activity_feeds", clientId), payload, { merge: true });
      localStorage.setItem("dpg_last_feed_sync", todayStr);
      console.log("Daily user feed and cookies pushed to Firestore successfully.");
    } catch (e) {
      console.warn("dailySyncToFirestore sync warning:", e);
    }
  }
  window.dpgFeed = {
    logPdfVisit,
    logSerpSearch,
    getUserFeedWeights,
    scoreResource,
    dailySyncToFirestore,
    getClientDeviceId
  };
})();
