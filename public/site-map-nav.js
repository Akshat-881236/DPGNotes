/**
 * DPGNotes Site Navigation & SEO JSON-LD Engine (site-map-nav.js)
 * Automatically injects high-fidelity Schema.org JSON-LD SiteNavigationElement & ItemList
 * Predefined curated vault across 4 resource categories + Contributor Profiles.
 * Synchronizes new resources from Firestore every 12 hours tracked via IndexedDB per device.
 */
(function() {
  'use strict';

  var SITEMAP_SCRIPT_ID = 'dpg-site-nav-jsonld';
  var DB_NAME = 'dpg_sitemap_sync_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'sitemap_meta';
  var SYNC_RECORD_KEY = 'sync_state';
  var SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 Hours

  // ==========================================
  // PREDEFINED STATIC VAULT OF CORE RESOURCES
  // ==========================================
  var PREDEFINED_VAULT = {
    hubs: [
      { name: "DPGNotes Academic Portal", url: "https://dpgnotes.web.app/", description: "Verified academic notes, university question papers, and educational resources." },
      { name: "DPGNotes Study Hub", url: "https://dpgnotes.web.app/study-hub.html", description: "Central repository of semester notes, syllabus, and study materials." },
      { name: "DPGNotes Search Engine", url: "https://dpgnotes.web.app/dpgnotes-search-engine.html", description: "Search university notes, solutions, and lab practicals." },
      { name: "DPGNotes SERP", url: "https://dpgnotes.web.app/dpgnotes-serp.html", description: "Search Engine Results Page for academic resources and solutions." },
      { name: "Assignment Solutions Hub", url: "https://dpgnotes.web.app/AssignmentSolution/index.html", description: "Verified university assignment solutions with step-by-step answers." },
      { name: "Practical Lab Solutions Hub", url: "https://dpgnotes.web.app/PracticalSolution/index.html", description: "Lab manuals, source code, and interactive execution sandboxes." },
      { name: "Quiz & Examination Engine", url: "https://dpgnotes.web.app/Quizes/index.html", description: "Online assessments, subject quizzes, and timed mock tests." }
    ],
    contributors: [
      {
        uid: "CCoQSl_FtzWt4NGF6zox3tO399Xg1",
        name: "Akshat Prasad",
        role: "Head Administrator & Lead Contributor",
        profileUrl: "https://dpgnotes.web.app/profile.html?uid=CCoQSl_FtzWt4NGF6zox3tO399Xg1"
      },
      {
        uid: "N7D544J5IdYane7huazhZmjOOKu1",
        name: "DPGNotes Verified Contributor",
        role: "Academic Contributor",
        profileUrl: "https://dpgnotes.web.app/profile.html?uid=N7D544J5IdYane7huazhZmjOOKu1"
      }
    ],
    pdfResources: [
      {
        id: "res_java_sample_paper",
        title: "Java Programming Sample Paper",
        subject: "Computer Science",
        category: "Sample Paper",
        description: "8 Sample Paper of Java Programming Covering whole Syllabus.",
        tags: "Java, JVM, JRE, Sample Paper",
        url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=res_java_sample_paper"
      },
      {
        id: "res_coa_2026_exam",
        title: "COA 2026 May Exam Question Paper",
        subject: "Computer Science",
        category: "Question Paper",
        description: "This is COA MDU Sem - 4 May - 2026 Examination Question Paper that help juniors prepare for same In advance.",
        tags: "COA, MDU, Exam Paper, Computer Architecture",
        url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=res_coa_2026_exam"
      },
      {
        id: "res_dsa_handwritten_notes",
        title: "Data Structures & Algorithms Complete Notes",
        subject: "Information Technology",
        category: "Handwritten Notes",
        description: "Complete handwritten notes on Stacks, Queues, Trees, Graphs, and Algorithmic Complexity analysis.",
        tags: "DSA, Data Structures, Algorithms, Trees, Graphs",
        url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=res_dsa_handwritten_notes"
      },
      {
        id: "res_dbms_complete_manual",
        title: "Database Management Systems (DBMS) Comprehensive Reference",
        subject: "Computer Science",
        category: "Study Notes",
        description: "Relational database concepts, SQL queries, ER diagrams, Normalization (1NF-BCNF), and Transaction Management.",
        tags: "DBMS, SQL, Normalization, Transactions, Database",
        url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=res_dbms_complete_manual"
      }
    ],
    assignmentSolutions: [
      {
        id: "assign_1794721052637_c5p33",
        title: "Data Structures & Algorithms Semester Assignment Solution",
        subject: "Data Structures",
        course: "B.Tech CSE Sem 3",
        description: "Complete assignment solution covering Array implementations, Linked Lists, Stack ADT, and Queue operations.",
        tags: "DSA, Stack, Queue, Linked List, B.Tech CSE",
        url: "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1794721052637_c5p33"
      },
      {
        id: "assign_1794584697252_tfiw0",
        title: "Object-Oriented Programming with Java Assignment",
        subject: "Java Programming",
        course: "B.Tech CSE Sem 4",
        description: "Verified answers with source code for Class hierarchies, Polymorphism, Interfaces, and Exception Handling.",
        tags: "Java, OOP, Inheritance, Exceptions, Assignment",
        url: "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1794584697252_tfiw0"
      },
      {
        id: "assign_web_tech_responsive",
        title: "Web Technologies & Responsive Layouts Assignment",
        subject: "Web Development",
        course: "B.Tech CSE Sem 5",
        description: "Modern CSS Grid, Flexbox, semantic HTML5, and responsive mobile layout implementations.",
        tags: "HTML5, CSS3, Responsive Design, Flexbox, Web Tech",
        url: "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_web_tech_responsive"
      }
    ],
    practicalSolutions: [
      {
        id: "prac_1795020824041_bq1os",
        title: "Web Development & Blogging Platform Practical Solution",
        subject: "Web Development",
        course: "Full Stack Lab Manual",
        description: "Develop a basic blogging website with pages for adding, viewing, and editing blog posts using HTML, CSS, and JavaScript localStorage.",
        tags: "HTML, CSS, JavaScript, LocalStorage, Web Practical",
        url: "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_1795020824041_bq1os"
      },
      {
        id: "prac_dsa_stack_queue_cpp",
        title: "Stack & Queue ADT Implementation in C++ Lab Manual",
        subject: "Data Structures Lab",
        course: "B.Tech CSE Sem 3 Lab",
        description: "Implementation of Array-based Stack ADT with push, pop, display operations and Infix to Postfix expression conversion.",
        tags: "C++, Stack, Queue, ADT, DSA Lab",
        url: "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_dsa_stack_queue_cpp"
      },
      {
        id: "prac_java_multithreading_lab",
        title: "Java Multithreading & Event Handling Practical Solution",
        subject: "Java Programming Lab",
        course: "B.Tech CSE Sem 4 Lab",
        description: "Practical experiments implementing Thread class, Runnable interface, thread synchronization, and GUI event listeners.",
        tags: "Java, Threads, Synchronization, GUI, Lab Practical",
        url: "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_java_multithreading_lab"
      }
    ],
    quizzes: [
      {
        id: "qz_mvexqvjv_vvj5d",
        title: "Computer Organization and Architecture Comprehensive Quiz",
        subject: "COA",
        description: "Assessment on CPU Architecture, Instruction Pipelines, Cache Memory, and Addressing Modes.",
        tags: "COA, Computer Architecture, Pipeline, Cache, Quiz",
        url: "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvexqvjv_vvj5d"
      },
      {
        id: "qz_data_structures_mastery",
        title: "Data Structures & Algorithms Knowledge Assessment",
        subject: "DSA",
        description: "Timed multiple-choice examination testing Trees, Graphs, Sorting algorithms, and asymptotic runtime notation.",
        tags: "DSA, Trees, Sorting, Big-O, Online Quiz",
        url: "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_data_structures_mastery"
      },
      {
        id: "qz_full_stack_web_assessment",
        title: "Full Stack Web Development & JS DOM Examination",
        subject: "Web Development",
        description: "Assessment covering modern JavaScript ES6+, DOM manipulation, asynchronous programming, and REST APIs.",
        tags: "JavaScript, ES6, DOM, Web Tech, Exam",
        url: "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_full_stack_web_assessment"
      }
    ]
  };

  // ==========================================
  // INDEXEDDB HELPER FOR 12-HOUR TRACKING
  // ==========================================
  function openSyncDatabase() {
    return new Promise(function(resolve, reject) {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
      request.onerror = function(err) {
        console.warn("Sitemap IndexedDB open error:", err);
        resolve(null);
      };
    });
  }

  function getSyncRecord(db) {
    return new Promise(function(resolve) {
      if (!db) { resolve(null); return; }
      try {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(SYNC_RECORD_KEY);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { resolve(null); };
      } catch(e) {
        resolve(null);
      }
    });
  }

  function saveSyncRecord(db, record) {
    return new Promise(function(resolve) {
      if (!db) { resolve(false); return; }
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.put(record);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      } catch(e) {
        resolve(false);
      }
    });
  }

  // ==========================================
  // BUILD SCHEMA.ORG JSON-LD STRUCTURE
  // ==========================================
  function generateJsonLdData(dynamicItems) {
    var allPdfs = PREDEFINED_VAULT.pdfResources.concat(dynamicItems.pdfResources || []);
    var allAssigns = PREDEFINED_VAULT.assignmentSolutions.concat(dynamicItems.assignmentSolutions || []);
    var allPracticals = PREDEFINED_VAULT.practicalSolutions.concat(dynamicItems.practicalSolutions || []);
    var allQuizzes = PREDEFINED_VAULT.quizzes.concat(dynamicItems.quizzes || []);

    // 1. SiteNavigationElement Items
    var navElements = [];
    PREDEFINED_VAULT.hubs.forEach(function(h) {
      navElements.push({
        "@type": "SiteNavigationElement",
        "name": h.name,
        "url": h.url,
        "description": h.description
      });
    });

    PREDEFINED_VAULT.contributors.forEach(function(c) {
      navElements.push({
        "@type": "SiteNavigationElement",
        "name": c.name + " (" + c.role + ")",
        "url": c.profileUrl,
        "description": "Contributor Profile & published academic portfolio of " + c.name
      });
    });

    // 2. Comprehensive ItemList for Search Engine Indexing
    var itemListElements = [];
    var pos = 1;

    function addItemsToList(items, categoryName) {
      items.forEach(function(it) {
        itemListElements.push({
          "@type": "ListItem",
          "position": pos++,
          "name": it.title,
          "url": it.url,
          "description": it.description || (categoryName + " - " + (it.subject || "")),
          "additionalType": categoryName,
          "keywords": it.tags || it.subject || categoryName
        });
      });
    }

    addItemsToList(allPdfs, "PDF Educational Resource");
    addItemsToList(allAssigns, "Academic Assignment Solution");
    addItemsToList(allPracticals, "Practical Laboratory Solution");
    addItemsToList(allQuizzes, "Online Examination & Quiz");

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://dpgnotes.web.app/#website",
          "url": "https://dpgnotes.web.app/",
          "name": "DPGNotes",
          "alternateName": ["DPG Notes", "Akshat Network Hub"],
          "description": "Verified academic notes, university assignment solutions, practical laboratory manuals, and AI-assisted examination engine.",
          "inLanguage": "en-US",
          "publisher": {
            "@type": "Organization",
            "name": "Akshat Network Hub",
            "url": "https://dpgnotes.web.app",
            "logo": {
              "@type": "ImageObject",
              "url": "https://dpgnotes.web.app/ANH.png"
            }
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://dpgnotes.web.app/dpgnotes-serp.html?tag={search_term_string}&tab=all"
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "ItemList",
          "@id": "https://dpgnotes.web.app/#site-navigation-list",
          "name": "DPGNotes Platform Navigation Hubs",
          "description": "Core navigational categories, academic hubs, and contributor profiles across DPGNotes.",
          "itemListElement": navElements.map(function(elem, i) {
            return {
              "@type": "ListItem",
              "position": i + 1,
              "item": elem
            };
          })
        },
        {
          "@type": "ItemList",
          "@id": "https://dpgnotes.web.app/#curated-academic-resources",
          "name": "DPGNotes Academic Knowledge Index",
          "description": "Authoritative catalog of verified university PDF resources, assignment solutions, practical manuals, and quizzes.",
          "numberOfItems": itemListElements.length,
          "itemListElement": itemListElements
        }
      ]
    };
  }

  // ==========================================
  // INJECT JSON-LD SCRIPT AT VERY TOP OF HEAD
  // ==========================================
  function injectJsonLd(jsonData) {
    try {
      var existing = document.getElementById(SITEMAP_SCRIPT_ID);
      if (existing) {
        existing.textContent = JSON.stringify(jsonData, null, 2);
        return;
      }
      var script = document.createElement('script');
      script.id = SITEMAP_SCRIPT_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonData, null, 2);

      // Insert at the very top of <head>
      if (document.head.firstChild) {
        document.head.insertBefore(script, document.head.firstChild);
      } else {
        document.head.appendChild(script);
      }
    } catch(e) {
      console.warn("JSON-LD injection warning:", e);
    }
  }

  // ==========================================
  // DYNAMIC FIRESTORE SYNC (EVERY 12 HOURS)
  // ==========================================
  async function fetchFreshFirestoreResources() {
    var results = {
      pdfResources: [],
      assignmentSolutions: [],
      practicalSolutions: [],
      quizzes: []
    };

    var knownPdfIds = new Set(PREDEFINED_VAULT.pdfResources.map(function(x) { return x.id; }));
    var knownAssignIds = new Set(PREDEFINED_VAULT.assignmentSolutions.map(function(x) { return x.id; }));
    var knownPracIds = new Set(PREDEFINED_VAULT.practicalSolutions.map(function(x) { return x.id; }));
    var knownQuizIds = new Set(PREDEFINED_VAULT.quizzes.map(function(x) { return x.id; }));

    // Strategy 1: Use window.solDb or window.dpgDb or modular firestore if loaded on page
    var db = window.dpgDb || window.solDb || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);

    // Strategy 2: If Firestore SDK is not yet available, use Firebase REST API fallback
    var projectId = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) || "dpgnotes";
    var restBase = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents";

    // 1. Fetch PDF Resources
    try {
      if (db && window.collection && window.getDocs && window.query && window.limit) {
        var snap = await window.getDocs(window.query(window.collection(db, "documents"), window.limit(25)));
        snap.forEach(function(docSnap) {
          var d = docSnap.data() || {};
          var docId = d.documentId || docSnap.id;
          if (docId && !knownPdfIds.has(docId)) {
            results.pdfResources.push({
              id: docId,
              title: d.title || "Academic PDF Document",
              subject: d.discipline || d.subject || "General",
              category: d.category || "Notes",
              description: d.description || ("Verified notes on " + (d.title || docId)),
              tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
              url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=" + encodeURIComponent(docId)
            });
            knownPdfIds.add(docId);
          }
        });
      } else {
        var resp = await fetch(restBase + "/documents?pageSize=25").then(function(r) { return r.json(); });
        if (resp && resp.documents) {
          resp.documents.forEach(function(docItem) {
            var f = docItem.fields || {};
            var docId = (f.documentId && f.documentId.stringValue) || docItem.name.split('/').pop();
            if (docId && !knownPdfIds.has(docId)) {
              results.pdfResources.push({
                id: docId,
                title: (f.title && f.title.stringValue) || "Academic PDF Document",
                subject: (f.discipline && f.discipline.stringValue) || (f.subject && f.subject.stringValue) || "General",
                category: (f.category && f.category.stringValue) || "Notes",
                description: (f.description && f.description.stringValue) || "",
                tags: (f.tags && f.tags.stringValue) || "",
                url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=" + encodeURIComponent(docId)
              });
              knownPdfIds.add(docId);
            }
          });
        }
      }
    } catch(err) {
      console.warn("Sitemap: PDF fetch notice:", err);
    }

    // 2. Fetch Assignment Solutions & Practical Solutions
    try {
      if (db && window.solCollectionGroup && window.solGetDocs && window.solQuery && window.solLimit) {
        var solSnap = await window.solGetDocs(window.solQuery(window.solCollectionGroup(db, "solutions"), window.solLimit(40)));
        solSnap.forEach(function(docSnap) {
          var d = docSnap.data() || {};
          var solId = d.id || docSnap.id;
          var isPractical = docSnap.ref.path.includes("practical_solutions") || (solId && solId.startsWith('prac_'));
          if (isPractical) {
            if (solId && !knownPracIds.has(solId)) {
              results.practicalSolutions.push({
                id: solId,
                title: (d.subjectName || d.subjectCode || "Lab") + " Practical Solution",
                subject: d.subjectName || "Practical Lab",
                course: d.course || "Lab Manual",
                description: "Verified practical lab experiments, algorithms, and code sandbox for " + (d.subjectName || solId),
                tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
                url: "https://dpgnotes.web.app/PracticalSolution/index.html?id=" + encodeURIComponent(solId)
              });
              knownPracIds.add(solId);
            }
          } else {
            if (solId && !knownAssignIds.has(solId)) {
              results.assignmentSolutions.push({
                id: solId,
                title: (d.subjectName || d.subjectCode || "Academic") + " Assignment Solution",
                subject: d.subjectName || "Assignment",
                course: d.course || "Course Assignment",
                description: "Step-by-step academic assignment solution and test cases for " + (d.subjectName || solId),
                tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
                url: "https://dpgnotes.web.app/AssignmentSolution/index.html?id=" + encodeURIComponent(solId)
              });
              knownAssignIds.add(solId);
            }
          }
        });
      }
    } catch(err) {
      console.warn("Sitemap: Solutions fetch notice:", err);
    }

    // 3. Fetch Quizzes from quizDirectory
    try {
      if (db && window.collection && window.getDocs && window.query && window.where) {
        var qzSnap = await window.getDocs(window.query(window.collection(db, "quizDirectory"), window.where("status", "==", "published")));
        qzSnap.forEach(function(docSnap) {
          var q = docSnap.data() || {};
          var qId = q.quizId || docSnap.id;
          if (qId && !knownQuizIds.has(qId)) {
            results.quizzes.push({
              id: qId,
              title: q.title || "Academic Quiz Assessment",
              subject: q.subjectCode || q.subjectName || "Assessment",
              description: q.description || ("Online academic quiz on " + (q.title || qId)),
              tags: Array.isArray(q.topicTags) ? q.topicTags.join(', ') : (q.topicTags || q.tags || ''),
              url: "https://dpgnotes.web.app/Quizes/index.html?quizId=" + encodeURIComponent(qId)
            });
            knownQuizIds.add(qId);
          }
        });
      } else {
        var qResp = await fetch(restBase + "/quizDirectory?pageSize=25").then(function(r) { return r.json(); });
        if (qResp && qResp.documents) {
          qResp.documents.forEach(function(docItem) {
            var f = docItem.fields || {};
            var qId = (f.quizId && f.quizId.stringValue) || docItem.name.split('/').pop();
            var status = (f.status && f.status.stringValue) || 'published';
            if (qId && status === 'published' && !knownQuizIds.has(qId)) {
              results.quizzes.push({
                id: qId,
                title: (f.title && f.title.stringValue) || "Academic Quiz Assessment",
                subject: (f.subjectCode && f.subjectCode.stringValue) || "Assessment",
                description: (f.description && f.description.stringValue) || "",
                tags: (f.topicTags && f.topicTags.stringValue) || "",
                url: "https://dpgnotes.web.app/Quizes/index.html?quizId=" + encodeURIComponent(qId)
              });
              knownQuizIds.add(qId);
            }
          });
        }
      }
    } catch(err) {
      console.warn("Sitemap: Quizzes fetch notice:", err);
    }

    return results;
  }

  // ==========================================
  // INITIALIZATION CONTROLLER
  // ==========================================
  async function initSiteMapNav() {
    // Stage 1: Synchronous initial injection using predefined vault
    var initialJsonLd = generateJsonLdData({});
    injectJsonLd(initialJsonLd);

    // Stage 2: Check IndexedDB for 12-hour sync schedule
    try {
      var idb = await openSyncDatabase();
      var syncRecord = await getSyncRecord(idb);

      var cachedDynamicItems = (syncRecord && syncRecord.dynamicResources) || {
        pdfResources: [],
        assignmentSolutions: [],
        practicalSolutions: [],
        quizzes: []
      };

      // If cached dynamic items exist, update JSON-LD immediately
      if (syncRecord && syncRecord.dynamicResources) {
        injectJsonLd(generateJsonLdData(cachedDynamicItems));
      }

      var now = Date.now();
      var lastSync = (syncRecord && syncRecord.lastSyncTimestamp) || 0;
      var isSyncDue = (now - lastSync >= SYNC_INTERVAL_MS);

      if (isSyncDue) {
        // Run background fetch
        setTimeout(async function() {
          try {
            var freshItems = await fetchFreshFirestoreResources();

            // Merge fresh items with cached items
            var merged = {
              pdfResources: (cachedDynamicItems.pdfResources || []).concat(freshItems.pdfResources || []),
              assignmentSolutions: (cachedDynamicItems.assignmentSolutions || []).concat(freshItems.assignmentSolutions || []),
              practicalSolutions: (cachedDynamicItems.practicalSolutions || []).concat(freshItems.practicalSolutions || []),
              quizzes: (cachedDynamicItems.quizzes || []).concat(freshItems.quizzes || [])
            };

            // Deduplicate by ID
            function dedupeList(arr) {
              var seen = new Set();
              return arr.filter(function(x) {
                if (!x || !x.id || seen.has(x.id)) return false;
                seen.add(x.id);
                return true;
              });
            }

            merged.pdfResources = dedupeList(merged.pdfResources);
            merged.assignmentSolutions = dedupeList(merged.assignmentSolutions);
            merged.practicalSolutions = dedupeList(merged.practicalSolutions);
            merged.quizzes = dedupeList(merged.quizzes);

            // Save to IndexedDB
            await saveSyncRecord(idb, {
              id: SYNC_RECORD_KEY,
              lastSyncTimestamp: now,
              dynamicResources: merged
            });

            // Update JSON-LD with enriched graph
            injectJsonLd(generateJsonLdData(merged));
          } catch(syncErr) {
            console.warn("Background sitemap sync error:", syncErr);
          }
        }, 1500);
      }
    } catch(e) {
      console.warn("Sitemap IndexedDB init warning:", e);
    }
  }

  // Execute immediately so script injects JSON-LD into <head> as early as possible
  initSiteMapNav();
})();
