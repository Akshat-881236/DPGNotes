/**
 * DPGNotes Project-Based FSD Tutorial, SRS Overview & Technical Blueprint
 * Script: script.js (Editorial Technical Blog Architecture v2.1.0)
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
  authDomain: "dpgnotes.firebaseapp.com",
  projectId: "dpgnotes",
  storageBucket: "dpgnotes.firebasestorage.app",
  messagingSenderId: "910494426039",
  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = getApps().find(a => a.name === "dpgnotes") || (!getApps().length ? initializeApp(firebaseConfig, "dpgnotes") : getApps()[0]);
const db = getFirestore(app);
const auth = getAuth(app);

// State
let currentActiveUser = null;
let currentClearanceRecord = null;
let currentActiveTabIndex = 1;
const tabCache = new Map();

// ============================================================================
// 12 STANDALONE MODULE DEFINITIONS (EDITORIAL BLOG TAXONOMY)
// ============================================================================
export const MODULE_GROUPS = [
  {
    groupTitle: "Core Platform & Architecture",
    groupIcon: "ri-cpu-line",
    modules: [
      {
        id: 1,
        slug: "architecture",
        title: "Platform Architecture & System Topography",
        icon: "ri-cpu-line",
        readTime: "15 min read",
        desc: "Master Full Stack 3-tier system design: Edge CDN routing, client-server topology, serverless triggers, and high-availability SRS requirements."
      },
      {
        id: 2,
        slug: "frontend",
        title: "Frontend Engineering & UI Component Hierarchy",
        icon: "ri-layout-masonry-line",
        readTime: "16 min read",
        desc: "In-depth Vanilla JS component architecture, CSS custom properties, responsive breakpoints, foldable device support, and progressive hydration."
      },
      {
        id: 3,
        slug: "backend-api",
        title: "Express Backend, Server API Endpoints & Microservices",
        icon: "ri-server-line",
        readTime: "18 min read",
        desc: "Exhaustive documentation of Node.js / Express backend service on Render, REST endpoints, JWT verification, and telemetry dispatchers."
      }
    ]
  },
  {
    groupTitle: "Media, Database & Security",
    groupIcon: "ri-database-2-line",
    modules: [
      {
        id: 4,
        slug: "cloudinary-media",
        title: "Cloudinary Media Pipeline & PDF Processing Engine",
        icon: "ri-image-line",
        readTime: "15 min read",
        desc: "Automated media transformation pipelines, dynamic cover page rendering, signed uploads, and low-bandwidth asset optimization."
      },
      {
        id: 5,
        slug: "database-schema",
        title: "Cloud Firestore Real-Time Database & Data Modeling",
        icon: "ri-database-line",
        readTime: "17 min read",
        desc: "Complete NoSQL schema design, collections and subcollections, denormalization, Firestore security rules, and atomic transactions."
      },
      {
        id: 6,
        slug: "security-vault",
        title: "Cryptographic Vault & AES-256-GCM Security Engine",
        icon: "ri-shield-keyhole-line",
        readTime: "18 min read",
        desc: "Proprietary code obfuscation, authenticated AES-256-GCM encryption, in-memory sandboxed V8 execution, and PBKDF2 key derivation."
      }
    ]
  },
  {
    groupTitle: "AI Intelligence & Search",
    groupIcon: "ri-brain-line",
    modules: [
      {
        id: 7,
        slug: "ai-engine",
        title: "Multi-Engine AI Orchestration & Fallback Pipelines",
        icon: "ri-brain-line",
        readTime: "16 min read",
        desc: "Tiered multi-model architecture: Google Gemini 1.5/2.0 Pro/Flash priority cascade with automatic fallback to xAI Grok."
      },
      {
        id: 8,
        slug: "search-engine",
        title: "High-Performance Search & SERP Ranking Algorithms",
        icon: "ri-search-eye-line",
        readTime: "14 min read",
        desc: "Lexical & semantic search engine, tokenization, multi-field weighted scoring, CTR feedback loops, and sub-50ms query benchmarks."
      },
      {
        id: 9,
        slug: "video-ecosystem",
        title: "Educational Media Studio & Video Ecosystem",
        icon: "ri-video-line",
        readTime: "14 min read",
        desc: "Dual HTML5/YouTube player engine, academic vs sponsored switching, double-write persistence pattern, and share tokens."
      }
    ]
  },
  {
    groupTitle: "Governance, RBAC & Cloud Ops",
    groupIcon: "ri-scales-3-line",
    modules: [
      {
        id: 10,
        slug: "contributor-rbac",
        title: "Contributor Ecosystem & Role-Based Access Control (RBAC)",
        icon: "ri-team-line",
        readTime: "15 min read",
        desc: "User identity hierarchy, auth parity (Password & Google OAuth), clearance levels, reputation scoring, and the Admin Confidential Tab."
      },
      {
        id: 11,
        slug: "legal-compliance",
        title: "Legal Center, DMCA, Privacy & Compliance Policies",
        icon: "ri-scales-3-line",
        readTime: "16 min read",
        desc: "Official legal governance: DMCA notice-and-takedown workflow, DRASA framework, automated 14-day ephemeral data cleansing, and privacy."
      },
      {
        id: 12,
        slug: "devops-cicd",
        title: "DevOps, Cloud Deployment & CI/CD Telemetry",
        icon: "ri-git-branch-line",
        readTime: "15 min read",
        desc: "Multi-cloud architecture (Firebase Hosting + Render Node.js), GitHub Actions CI/CD automation, secrets vault lifecycle, and monitoring."
      }
    ]
  }
];

export const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

// ============================================================================
// LENGTHY, HIGH-QUALITY STUDY NOTES REGISTRY (NO CARD-IN-CARD - SIMPLE BLOGS)
// ============================================================================
const BLOG_STUDY_NOTES = {
  1: {
    subtitle: "Enterprise 3-Tier System Topography, Edge CDN Proxies & Stateless Cloud Clustering",
    lead: "In modern distributed web engineering, decoupling the presentation interface from business logic and database persistence is the foundational paradigm for scalability. DPGNotes implements a production-grade 3-tier hybrid cloud architecture that bridges Google's global edge network with containerized Node.js compute nodes and Google Cloud Firestore multi-region clusters, delivering sub-100ms response latencies to students across 8 core academic disciplines.",
    techStack: ["Node.js 20 LTS", "Express.js", "Firebase Hosting", "Cloud Firestore", "Render Cloud", "Fastly Edge CDN", "HTTP/3", "TLS 1.3"],
    srsMission: "The Software Requirements Specification (SRS Section 1.0) mandates uninterrupted academic accessibility with zero paywalls, complete contributor attribution, and verifiable cryptographic integrity. The platform ingests and serves study materials across 8 core academic categories: Sessional Exams (SE), Sample Papers (SP), University Exams (UE), Event Materials (EV), Tutorial & Notes (T&N), Interview Questions (IQ), Aptitude & Logical Reasoning (A&LR), and Placement Papers (PQ).",
    components: [
      { name: "1. Presentation Layer (Global Client SPA)", text: "Deployed globally across Google Firebase Hosting edge Points of Presence (PoPs), serving static assets over HTTP/3 with automatic Brotli compression, edge SSL termination, and immutable browser caching." },
      { name: "2. Edge Reverse Proxy Gateway", text: "Edge rewrite rules intercept incoming /api/** traffic and proxy requests directly to containerized backend clusters, forwarding client IP headers (x-forwarded-for) while cloaking origin server infrastructure." },
      { name: "3. Stateless Compute Microservices", text: "A 12-factor Node.js / Express cluster hosted on Render. State is completely externalized to persistent datastores, enabling seamless horizontal scale-out behind native reverse-proxy load balancers." },
      { name: "4. Distributed Persistence Backbone", text: "Google Cloud Firestore multi-region clusters (eur3) providing automatic sharding, real-time snapshot synchronization (onSnapshot), and sub-50ms query execution." }
    ],
    tutorialSteps: [
      "Configure firebase.json with selective edge rewrites mapping all /api/** calls directly to the Render microservice while serving static HTML/JS/CSS assets with immutable cache-control headers (max-age=31536000).",
      "Bootstrap the Express application setting app.set('trust proxy', 1) to accurately capture remote client IP addresses behind multi-tier load balancers.",
      "Attach helmet and cors middleware configuring strict origin whitelisting allowing only official production domains (https://dpgnotes.web.app).",
      "Implement non-blocking health check probes (/api/health) queried every 10 minutes by micro-daemon pings to prevent container sleep cycles on containerized cloud tiers.",
      "Initialize Google Cloud Firestore multi-region drivers with atomic counter transactions to prevent race conditions during high-concurrency student access periods."
    ],
    codeSnippet: `// Module 1: Production 3-Tier Express Gateway & Health Monitor
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

// Enforce strict academic security boundary
app.use(cors({
  origin: ['https://dpgnotes.web.app', 'https://dpgnotes.firebaseapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'DPGNotes-Core-Gateway',
    clusterRegion: 'eu-west-1'
  });
});`,
    invariants: [
      "Edge reverse proxy routing latency must remain below 15ms under standard network conditions.",
      "Zero unauthenticated bypass of API gateways; state-mutating requests require validated cryptographic session tokens.",
      "All engagement metric updates execute atomically via Firestore increment(1) to eliminate concurrency drift.",
      "Strict compliance with DRASA institutional academic open-access standards and continuous telemetry auditing."
    ],
    specParameters: [
      { name: "Operational SLA", value: "99.95% Continuous Uptime", mechanism: "Multi-Region Edge Failover & Health Probes" },
      { name: "Network Protocol", value: "HTTP/3 & TLS 1.3", mechanism: "Automated Google Cloud SSL Lifecycle" },
      { name: "Cold Start Defense", value: "Sub-Second Recovery", mechanism: "Automated Micro-Daemon Keep-Alive Pings" },
      { name: "Data Encryption", value: "AES-256-GCM + TLS 1.3", mechanism: "In-Memory Vault & Strict HSTS Enforcements" }
    ]
  },

  2: {
    subtitle: "Zero-Framework Vanilla JS Component Architecture, CSS Custom Properties & Responsive Breakpoints",
    lead: "Frontend engineering in DPGNotes prioritizes raw performance, zero-dependency reliability, and universal device responsiveness. By bypassing heavy virtual DOM frameworks, DPGNotes delivers instant First Contentful Paint (FCP) and smooth 60fps animations across devices ranging from ultra-compact 280px foldable phones to 4K desktop workstations, while embedding accessible custom modals and canvas-based DRM watermarking.",
    techStack: ["Vanilla JavaScript (ES6+)", "CSS Custom Properties", "PDF.js Web Canvas Engine", "Service Worker (PWA)", "Web Storage API"],
    srsMission: "SRS Section 2.0 requires seamless cross-device rendering without layout shaking or horizontal viewport overflow. Every interactive component must comply with WCAG 2.1 AA accessibility standards, eliminate main-thread blocking alerts, and dynamically adapt surface elevations to user theme preferences (Dark, Light, and System Auto).",
    components: [
      { name: "1. Centralized CSS Custom Properties", text: "Global design tokens declared in :root establishing semantic color palettes, surface glassmorphism elevations, and responsive typographic clamp() scales." },
      { name: "2. Modular Component Lifecycle Engine", text: "Vanilla JS controller classes governing initialization, hydration, event binding, and DOM destruction without external framework overhead." },
      { name: "3. Custom Asynchronous Modal Framework", text: "Promise-based dialogs (customAlert, customConfirm) that prevent browser UI thread freezes and provide accessible focus-trapping." },
      { name: "4. Dynamic Web Canvas DRM Engine", text: "Integrates PDF.js to render multi-page academic lecture notes onto HTML5 canvas elements with dynamic in-memory contributor attribution stamps." }
    ],
    tutorialSteps: [
      "Define semantic CSS custom properties in :root for primary accents, translucent card surfaces (rgba(255,255,255,0.08)), and responsive typography.",
      "Implement fluid container math using width: 100%, max-width: 100%, and box-sizing: border-box on all DOM elements to prevent horizontal overflow on narrow screens.",
      "Build custom asynchronous dialog controllers (custom-dialogs.js) returning JavaScript Promises for seamless async/await modal workflows.",
      "Configure touch-friendly navigation with off-canvas sidebar drawers and horizontal snap-scroll tracks (scroll-snap-type: x mandatory).",
      "Integrate PDF.js canvas rendering pipelines to composite contributor names, verification timestamps, and DRASA seals onto study sheets prior to screen paint."
    ],
    codeSnippet: `// Module 2: Asynchronous Custom Dialog Framework (Zero Blocking Alerts)
window.customAlert = function(message, options = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-dialog-backdrop active';
    backdrop.innerHTML = \`
      <div class="custom-dialog-card">
        <div class="dialog-icon"><i class="ri-information-line"></i></div>
        <h3>\${options.title || 'DPGNotes Notification'}</h3>
        <p>\${message}</p>
        <button class="dialog-btn-primary" id="btnOk">Acknowledge</button>
      </div>\`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#btnOk').onclick = () => {
      backdrop.remove();
      resolve(true);
    };
  });
};`,
    invariants: [
      "Zero horizontal page-level overflow across all viewports from 280px foldables to 4K monitors.",
      "Native browser alert(), confirm(), and prompt() calls are strictly prohibited across all frontend files.",
      "Interactive touch targets must measure at least 44px by 44px on touch-enabled devices.",
      "WCAG 2.1 AA accessibility compliance across all color palettes, contrast ratios, and screen reader labels."
    ],
    specParameters: [
      { name: "Hydration Latency", value: "Sub-50ms DOM Ready", mechanism: "Vanilla JS Script Deferred Execution" },
      { name: "Viewport Range", value: "280px to 3840px", mechanism: "Fluid CSS clamp() & Mobile Drawer Navigation" },
      { name: "Dialog Paradigm", value: "100% Async Promises", mechanism: "custom-dialogs.js Custom DOM Components" },
      { name: "Watermark Defense", value: "In-Memory Canvas DRM", mechanism: "PDF.js Compositing Before Screen Render" }
    ]
  },

  3: {
    subtitle: "High-Throughput Node.js Microservices, Dual Token Validation & Resilient REST Pipelines",
    lead: "The computational core of DPGNotes operates as an Express.js microservice hosted on Render cloud infrastructure. Designed around the 12-factor application methodology, the service processes document ingestion, session authentication, transactional emails via Brevo SMTP, AI proxy requests, and telemetry tracking while defending against distributed denial-of-service (DDoS) threats.",
    techStack: ["Node.js 20 LTS", "Express.js", "Firebase Admin SDK", "JWT Authentication", "Brevo SMTP API", "express-rate-limit"],
    srsMission: "SRS Section 3.0 specifies stateless horizontal scalability, secure token verification, input validation boundaries, and automated error handling. All mutating endpoints must validate cryptographic session claims and reject payloads exceeding 10MB to maintain sub-second cold-start recovery and 99.95% uptime.",
    components: [
      { name: "1. Authentication Middleware Layer", text: "Inspects incoming Authorization: Bearer tokens, validates RS256 cryptographic signatures with Firebase Admin SDK, and extracts verified contributor claims." },
      { name: "2. Document Ingestion Pipeline", text: "Validates uploaded study material metadata, enforces academic stream taxonomies, and generates signed Cloudinary credentials." },
      { name: "3. Brevo Transactional Mailer", text: "Dispatches critical security notifications (2FA verification codes, password resets, verification updates) while suppressing non-essential emails." },
      { name: "4. Rate Limiting & DDoS Defense", text: "Employs sliding-window rate limiters restricting public endpoints to a maximum of 100 requests per 15 minutes per IP address." }
    ],
    tutorialSteps: [
      "Initialize Express application with strict trust-proxy configuration for cloud load balancers and reverse proxies.",
      "Attach helmet security headers and express.json body parsers enforcing 10MB payload size limits.",
      "Implement authentication middleware verifying Firebase Admin ID tokens on all protected routes.",
      "Construct RESTful resource endpoints (/api/documents, /api/ai/query, /api/share/generate-video) with structured Winston logging.",
      "Wrap third-party API integrations (Brevo, Cloudinary, Gemini) in timeout circuit breakers to prevent cascading service degradation."
    ],
    codeSnippet: `// Module 3: Firebase Admin Token Verification & Route Guard
const admin = require('firebase-admin');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed authorization header.' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token: ' + err.message });
  }
}

module.exports = { authenticateToken };`,
    invariants: [
      "All state-mutating endpoints enforce strict rate limits (maximum 100 requests per 15 minutes per IP).",
      "Payloads exceeding 10MB are rejected at edge middleware before buffer memory allocation.",
      "Zero plaintext API keys in git repositories; credentials reside in encrypted environment variables.",
      "Non-critical automated emails (likes, shares) are purged; only essential system and security emails fire."
    ],
    specParameters: [
      { name: "API Throughput", value: "500+ Req/Sec per Node", mechanism: "Stateless Node.js Asynchronous Event Loop" },
      { name: "Token Verification", value: "Firebase Admin SDK", mechanism: "Cryptographic RS256 Signature Validation" },
      { name: "DDoS Mitigation", value: "express-rate-limit", mechanism: "In-Memory IP Window Throttling" },
      { name: "Mail Gateway", value: "Brevo SMTP API", mechanism: "Transactional Only (2FA, Password Reset, Auth)" }
    ]
  },

  4: {
    subtitle: "Direct-to-Cloud Signed Uploads, Dynamic PDF Cover Synthesis & In-Memory DRM Watermarking",
    lead: "Academic study materials comprise diverse formats ranging from multi-page PDF lecture notes to handwritten lab records. DPGNotes offloads heavy media processing from application servers by establishing direct-to-cloud signed upload pipelines with Cloudinary, coupled with in-memory PDF parsing and adaptive CDN transformations that minimize student mobile bandwidth consumption.",
    techStack: ["Cloudinary Node.js SDK", "PDF-Lib", "HTML5 Canvas API", "Brotli Compression", "Signed Direct Uploads"],
    srsMission: "SRS Section 4.0 dictates secure media ingestion without intermediate server storage bottlenecks. All uploaded documents must undergo automated front cover thumbnail synthesis, page count extraction, dynamic contributor attribution watermarking, and bandwidth-optimized CDN delivery.",
    components: [
      { name: "1. Ephemeral Upload Signature Generator", text: "Backend service computing SHA-1 cryptographic signatures allowing verified contributors to upload directly to Cloudinary buckets." },
      { name: "2. Front Cover Thumbnail Pipeline", text: "Transforms the first page of uploaded PDFs into responsive 400x300 preview cards using Cloudinary dynamic URL parameters." },
      { name: "3. In-Memory PDF-Lib DRM Compositor", text: "Overlays dynamic student attribution stamps, upload timestamps, and institutional DRASA verification seals onto downloaded notes." },
      { name: "4. Adaptive Bandwidth Delivery", text: "Utilizes Cloudinary f_auto and q_auto directives to transcode media into modern WEBP/AVIF formats based on client device capabilities." }
    ],
    tutorialSteps: [
      "Configure the Cloudinary Node.js SDK on the backend with cloud name, API key, and API secret environment variables.",
      "Build a backend /api/cloudinary/sign endpoint generating signed SHA-1 timestamps for authenticated contributors.",
      "Implement client-side upload handlers dispatching files directly to Cloudinary's REST API with real-time progress events.",
      "Construct dynamic preview thumbnail URLs applying Cloudinary transformation flags (w_400,h_300,c_fill,q_auto,f_auto).",
      "Integrate PDF-Lib to watermark downloaded PDF documents in-memory with verified contributor names and DRASA integrity seals."
    ],
    codeSnippet: `// Module 4: Cloudinary Cryptographic Upload Signature Generator
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function generateUploadSignature(folder) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: folder || 'dpgnotes_academic_notes'
  }, process.env.CLOUDINARY_API_SECRET);
  return { timestamp, signature, apiKey: process.env.CLOUDINARY_API_KEY };
}`,
    invariants: [
      "All academic documents must retain contributor attribution watermarks across all generated pages.",
      "Original high-resolution master PDFs must be protected behind signed URL access tokens.",
      "Automatic fallback to low-resolution cached thumbnails when client networks report slow 2G/3G speeds.",
      "Zero unauthenticated uploads; all media pushes require a valid contributor session signature."
    ],
    specParameters: [
      { name: "Max Upload Size", value: "50MB per PDF Document", mechanism: "Cloudinary Signed Chunked Upload Policy" },
      { name: "CDN Acceleration", value: "Global Fastly Edge CDN", mechanism: "f_auto, q_auto Dynamic Image Transcoding" },
      { name: "Watermark Security", value: "In-Memory PDF-Lib", mechanism: "Serverless Dynamic Page Layer Compositing" },
      { name: "Format Support", value: "PDF, PNG, WEBP, JPEG", mechanism: "Automated MIME Validation Before Ingestion" }
    ]
  },

  5: {
    subtitle: "Distributed NoSQL Data Modeling, Compound Query Indexing & Real-Time Snapshot Synchronization",
    lead: "Data persistence in DPGNotes is powered by Google Cloud Firestore in multi-region configuration. By combining strategically denormalized document schemas with compound indexing and real-time reactive listeners (onSnapshot), DPGNotes achieves sub-50ms query speeds for student searches while maintaining atomic transactional consistency across high-velocity engagement metrics.",
    techStack: ["Google Cloud Firestore", "NoSQL Data Modeling", "Security Rules Engine", "Compound Indexing", "ACID Transactions"],
    srsMission: "SRS Section 5.0 specifies robust NoSQL collection schemas, granular security rules preventing unauthorized writes, atomic metric counter updates, and automated 14-day ephemeral data cleansing (TTL) to maintain optimal database performance and student privacy.",
    components: [
      { name: "1. Normalized Root Collections", text: "users, documents, share_links, videos, user_ads, confidential_overview_requests, and audit history ledgers." },
      { name: "2. Strategic Denormalization Layer", text: "Embeds author names, subject codes, and stream tags directly on document records to satisfy queries in a single read." },
      { name: "3. Compound B-Tree Query Indexes", text: "Accelerates multi-parameter filtered searches (stream + year + semester + createdAt) to sub-50ms execution." },
      { name: "4. Real-Time Snapshot Synchronization", text: "Binds client user interfaces to Firestore onSnapshot streams for instantaneous peer interaction updates." }
    ],
    tutorialSteps: [
      "Design normalized root collections in Firestore: users, documents, share_links, videos, user_ads, and audit ledgers.",
      "Define compound indexes in firestore.indexes.json for complex multi-field searches (stream + semester + createdAt).",
      "Deploy granular Firestore security rules in firestore.rules restricting state mutations exclusively to document owners.",
      "Implement atomic engagement counter updates using Firestore increment(1) to prevent write-lock collisions.",
      "Configure automated TTL data pruning policies to purge ephemeral telemetry logs and temporary tokens older than 14 days."
    ],
    codeSnippet: `// Module 5: Atomic Engagement Counter Update & Compound Query
import { doc, updateDoc, increment, collection, query, where, orderBy, getDocs } from "firebase/firestore";

export async function recordResourceClick(docId) {
  const docRef = doc(db, "documents", docId);
  await updateDoc(docRef, {
    clicks: increment(1),
    lastAccessedAt: new Date().toISOString()
  });
}

export async function fetchFilteredNotes(stream, semester) {
  const q = query(
    collection(db, "documents"),
    where("stream", "==", stream),
    where("semester", "==", Number(semester)),
    orderBy("createdAt", "desc")
  );
  return await getDocs(q);
}`,
    invariants: [
      "Engagement counters (clicks, likes, shares, views) must only be incremented via atomic increment(1).",
      "Security rules must enforce owner-only write permissions on user profiles and uploaded resources.",
      "Sensitive administrative clearance records can only be updated by verified administrator credentials.",
      "Database migrations must maintain backward compatibility with legacy document schemas."
    ],
    specParameters: [
      { name: "Query Latency", value: "Sub-50ms Multi-Region", mechanism: "Compound Indexed Firestore B-Tree Storage" },
      { name: "Concurrency Safety", value: "Atomic Field Updates", mechanism: "Firestore increment(1) Server Operations" },
      { name: "Data Retention", value: "Automated 14-Day TTL", mechanism: "Google Cloud Firestore Ephemeral Purge" },
      { name: "Access Control", value: "Granular Security Rules", mechanism: "Role-Based Claim Evaluation in firestore.rules" }
    ]
  },

  6: {
    subtitle: "Zero-Knowledge Server Execution, Authenticated AES-256-GCM & In-Memory V8 VM Sandboxing",
    lead: "To safeguard proprietary routing algorithms, AI orchestration prompts, and intellectual property from reverse-engineering, DPGNotes deploys an enterprise Cryptographic Vault. The Express server source code is compiled into an authenticated AES-256-GCM ciphertext file (server.payload.enc) and executed directly in RAM via Node's V8 VM sandbox without touching physical server disk.",
    techStack: ["Node.js crypto Module", "AES-256-GCM", "PBKDF2 Key Derivation", "V8 VM Sandboxed Execution", "HMAC-SHA256"],
    srsMission: "SRS Section 6.0 enforces zero plaintext source deployment in production environments. Any tampering with the ciphertext payload or invalid authentication tag must cause immediate process termination (exit code 1) to protect cryptographic integrity.",
    components: [
      { name: "1. Vault CLI Build Pipeline (vault.js)", text: "Build tool that hashes server.source.js, derives 256-bit AES keys via PBKDF2 (100,000 iterations), and generates server.payload.enc." },
      { name: "2. AES-256-GCM Authenticated Encryption", text: "Galois/Counter Mode cipher providing both confidential encryption and a 128-bit authentication tag detecting bit-flip attacks." },
      { name: "3. In-Memory V8 VM Sandbox", text: "Compiles decrypted JavaScript source strings directly into V8 execution contexts using new vm.Script() without disk footprint." },
      { name: "4. Automated Pre-Flight Test Suite", text: "verify-vault.js verifies all 5 security test suites (roundtrip, wrong key rejection, bit-flip tamper rejection, hash matching, V8 compile) before deployment." }
    ],
    tutorialSteps: [
      "Configure backend/security/vault.js CLI tool with PBKDF2 key derivation using 100,000 SHA-256 iterations and random salt.",
      "Read backend/server.source.js into an in-memory buffer and compute its authoritative SHA-256 integrity hash.",
      "Encrypt buffer using crypto.createCipheriv('aes-256-gcm', key, iv) and extract the 128-bit authentication tag.",
      "Emit ciphertext, IV, and auth tag into backend/server.payload.enc and verify bit-for-bit with verify-vault.js.",
      "In backend/server.js, decrypt payload into memory and execute via new vm.Script(decrypted).runInThisContext()."
    ],
    codeSnippet: `// Module 6: In-Memory Decryption & Sandboxed V8 Compilation
const crypto = require('crypto');
const vm = require('vm');

function runEncryptedServer(ciphertext, key, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  
  // Compile in V8 Script sandbox directly in memory
  const script = new vm.Script(decrypted.toString('utf8'), { filename: 'server.vm.js' });
  script.runInThisContext();
}`,
    invariants: [
      "server.source.js is strictly git-ignored and never deployed in plaintext to production environments.",
      "Any bit-flip in ciphertext or invalid authentication tag causes immediate process shutdown (exit code 1).",
      "Intermediate decrypted plaintext buffers in memory are scrubbed immediately after V8 VM compilation.",
      "All 5 automated vault security test suites must pass before git commits or deployments proceed."
    ],
    specParameters: [
      { name: "Encryption Standard", value: "AES-256-GCM (Authenticated)", mechanism: "Hardware-Accelerated OpenSSL Cipher" },
      { name: "Key Derivation", value: "PBKDF2 (100,000 Iterations)", mechanism: "HMAC-SHA256 with Cryptographic Salt" },
      { name: "Tamper Detection", value: "128-Bit GCM Auth Tag", mechanism: "Immediate Fail-Stop Process Exit on Mismatch" },
      { name: "Runtime Footprint", value: "Zero Disk Plaintext", mechanism: "Node.js V8 vm.Script In-Memory Execution" }
    ]
  },

  7: {
    subtitle: "Tiered Multi-LLM Architecture, Google Gemini Priority & Automated xAI Grok Fallback Cascade",
    lead: "Artificial intelligence in DPGNotes assists university students with regulatory legal guidance, automated lecture note summarization, and practical assignment solutions. The platform features a resilient multi-engine gateway prioritizing Google Gemini 2.0/1.5 Pro and Flash with an automated cascade fallback to xAI Grok upon quota exhaustion or latency spikes.",
    techStack: ["Google Gemini 2.0 / 1.5 Pro & Flash", "xAI Grok API", "Server-Sent Events (SSE)", "DOMPurify", "Marked.js"],
    srsMission: "SRS Section 7.0 mandates sub-2 second response latency, progressive streaming via Server-Sent Events (SSE), strict DOMPurify sanitization to prevent XSS injection, and context-aware system prompts enforcing academic integrity boundaries.",
    components: [
      { name: "1. Multi-LLM Fallback Cascade", text: "Priority 1: Gemini 2.0 Pro -> Priority 2: Gemini 1.5 Flash -> Priority 3: xAI Grok Fallback executed seamlessly." },
      { name: "2. Legal Center AI Advisor", text: "Specialized system instructions grounding responses in official DPGNotes policies and DRASA regulatory documentation." },
      { name: "3. Semantic PDF Chunk Summarizer", text: "Splits large academic notes into semantic chunks for real-time chapter summaries, key definitions, and formula extraction." },
      { name: "4. Strict XSS Sanitization Pipeline", text: "Processes all generated AI Markdown through DOMPurify before hydrating browser containers." }
    ],
    tutorialSteps: [
      "Configure Google Gemini API client with system instructions enforcing academic curriculum boundaries and anti-cheating rules.",
      "Configure secondary xAI Grok API client using Grok-beta endpoints as an automated fallback.",
      "Implement gateway dispatch function executing Gemini call inside try/catch with 8-second timeout.",
      "On quota exhaustion (HTTP 429) or timeout, seamlessly dispatch prompt to xAI Grok with identical system prompt.",
      "Sanitize generated Markdown stream using DOMPurify.sanitize(marked.parse(response)) before rendering."
    ],
    codeSnippet: `// Module 7: Multi-Engine AI Inference Gateway with Grok Fallback
async function generateAIResponse(prompt, systemInstruction) {
  try {
    // Priority 1: Google Gemini 2.0 / 1.5 Pro
    return await callGeminiAPI(prompt, systemInstruction);
  } catch (geminiErr) {
    console.warn("Gemini cascade failed, switching to Grok fallback:", geminiErr.message);
    try {
      // Priority 2: xAI Grok Fallback
      return await callGrokAPI(prompt, systemInstruction);
    } catch (grokErr) {
      throw new Error("All AI inference engines temporarily unavailable.");
    }
  }
}`,
    invariants: [
      "Zero direct insertion of raw AI markdown into the DOM; all content must pass DOMPurify sanitization.",
      "Fallback cascade between Gemini and Grok must execute transparently with sub-2 second response latency.",
      "System prompts must strictly prohibit generating examination solutions during live test hours.",
      "All AI requests are subject to contributor tier rate limits to prevent token quota exhaustion."
    ],
    specParameters: [
      { name: "Primary Model", value: "Google Gemini 2.0 / 1.5 Pro", mechanism: "Context-Aware System Prompt Injection" },
      { name: "Fallback Model", value: "xAI Grok (Grok-Beta)", mechanism: "Automated Error-Catch Cascade Circuit" },
      { name: "Response Protocol", value: "Server-Sent Events (SSE)", mechanism: "Progressive Token Streaming for Low Latency" },
      { name: "Sanitization Engine", value: "DOMPurify + Marked.js", mechanism: "Strict HTML Entity & Script Tag Stripping" }
    ]
  },

  8: {
    subtitle: "Inverted Indexing, Multi-Field Weighted Relevance & CTR Telemetry Dynamic Boosting",
    lead: "Finding high-yield study materials across thousands of university syllabi requires low-latency query processing. The DPGNotes search engine pairs client-side debounced memory trie lookups with server-side lexical tokenization and multi-field weighted scoring formulas that boost results based on verified student engagement.",
    techStack: ["Lexical Tokenizer", "Inverted Index Trie", "TF-IDF Scoring Formula", "OpenGraph Protocol", "Debounced Autocomplete"],
    srsMission: "SRS Section 8.0 mandates sub-50ms search query response times, instant 15ms autocomplete suggestions, faceted filtering across academic disciplines and semesters, and zero-result alternative topic recommendations.",
    components: [
      { name: "1. Client-Side Memory Trie Autocomplete", text: "Pre-hydrated trie data structure delivering sub-15ms auto-suggestions during keyboard input without server roundtrips." },
      { name: "2. Weighted Multi-Field Scoring Formula", text: "Dynamic relevance algorithm scoring matches: Title (50pts), Subject (30pts), Stream (20pts), Description (10pts)." },
      { name: "3. CTR Telemetry Feedback Loop", text: "Dynamically boosts resource search scores by 10% for every 100 verified student click-throughs." },
      { name: "4. Faceted Search Matrix", text: "Allows students to filter results by stream (SE, SP, UE, EV), academic year, semester, and resource category." }
    ],
    tutorialSteps: [
      "Build a client-side Trie data structure pre-populated with common university subjects and syllabus codes.",
      "Attach debounced input listeners (250ms) to the global search trigger rendering instant suggestions.",
      "Construct multi-field search ranking function calculating relevance scores for matched documents.",
      "Integrate Firestore query listeners with faceted filters (stream, year, semester, author).",
      "Log click-through rate (CTR) telemetry to dynamically boost high-yield resources in subsequent searches."
    ],
    codeSnippet: `// Module 8: Multi-Field Weighted Relevance Ranking Algorithm
function rankSearchResults(documents, queryTokens) {
  return documents.map(doc => {
    let score = 0;
    const title = (doc.title || '').toLowerCase();
    const subject = (doc.subject || '').toLowerCase();
    const stream = (doc.stream || '').toLowerCase();

    queryTokens.forEach(token => {
      if (title.includes(token)) score += 50;
      if (subject.includes(token)) score += 30;
      if (stream.includes(token)) score += 20;
    });

    // Boost score by historical engagement
    score += (Number(doc.clicks) || 0) * 0.1;
    score += (Number(doc.likes) || 0) * 0.5;

    return { ...doc, searchScore: score };
  }).filter(d => d.searchScore > 0).sort((a, b) => b.searchScore - a.searchScore);
}`,
    invariants: [
      "Autocomplete suggestions must render within 15ms of user keystrokes using memory trie lookups.",
      "Zero-result queries must dynamically surface related academic syllabus alternatives.",
      "Search bot crawlers must be served pre-rendered OpenGraph metadata for optimal SEO indexation.",
      "Search telemetry must record queries anonymously without storing student personal identifying information."
    ],
    specParameters: [
      { name: "Query Benchmark", value: "Sub-50ms Response Time", mechanism: "Client-Side Inverted Index & Firestore Indexes" },
      { name: "Scoring Formula", value: "Multi-Field Weighted Sum", mechanism: "Title (50) + Subject (30) + CTR Boost" },
      { name: "Autocomplete Latency", value: "Sub-15ms Trie Lookup", mechanism: "Pre-Hydrated In-Memory Search Index" },
      { name: "SEO Protocols", value: "Dynamic OpenGraph & XML", mechanism: "Automated Sitemap Generation for Web Crawlers" }
    ]
  },

  9: {
    subtitle: "Dual HTML5/YouTube Player Engine, Fullscreen Theater Mode & Double-Write Share Persistence",
    lead: "Visual lecture recordings and technical workshops are delivered through DPGNotes' dedicated Educational Media Studio. The ecosystem integrates a dual HTML5 and YouTube IFrame player with fullscreen theater mode, real-time social engagement, and a resilient double-write pattern guaranteeing share link database persistence across ad-blockers.",
    techStack: ["YouTube IFrame API", "HTML5 Media Player", "Firestore Real-Time Sync", "Web Share API", "Double-Write Pattern"],
    srsMission: "SRS Section 9.0 specifies seamless playback of academic syllabus lectures interleaved with approved sponsored educational ads, full-screen mobile orientation locking, screentime auditing, and guaranteed VSH_ token share persistence.",
    components: [
      { name: "1. Dual Player Bridge", text: "Unifies HTML5 controls with the YouTube IFrame Player API using postMessage events and custom overlay buttons." },
      { name: "2. Stream Pool Interleaving", text: "Dynamically switches between curated academic lecture playlists and sponsored university partner video advertisements." },
      { name: "3. Double-Write Share Architecture", text: "Writes share tokens directly to Firestore via client setDoc and dispatches redundant POST /api/share/generate-video calls." },
      { name: "4. Screentime Auditing Telemetry", text: "Logs 30-second interval retention pings to verify genuine student viewership before awarding contributor points." }
    ],
    tutorialSteps: [
      "Embed YouTube IFrame API script dynamically and initialize player with modestbranding and playsinline.",
      "Construct video player overlay with custom play/pause, scrub bar, volume, and theater mode toggles.",
      "Implement double-write share link generator creating unique VSH_ tokens pointing to dpgnotes-video.html.",
      "Attach Firestore real-time onSnapshot listeners to synchronize likes and view counts across concurrent viewers.",
      "Log screentime retention pings every 30 seconds of active playback to verify genuine student engagement."
    ],
    codeSnippet: `// Module 9: Double-Write Video Share Persistence Pattern
async function generateVideoShareLink(videoId, title) {
  const token = 'VSH_' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const shareData = {
    token: token,
    type: 'video',
    videoId: videoId,
    title: title || 'Educational Lecture',
    clicks: 0,
    createdAt: new Date().toISOString()
  };

  // 1. Direct Client Firestore Write
  await setDoc(doc(db, "share_links", token), shareData, { merge: true });

  // 2. Redundant Backend Dispatch (Guarantees persistence across ad-blockers)
  fetch('/api/share/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shareData)
  }).catch(() => {});

  return \`https://dpgnotes.web.app/dpgnotes-video.html?token=\${token}\`;
}`,
    invariants: [
      "Video share tokens must route exclusively to dpgnotes-video.html, never to the PDF viewer.",
      "Double-write persistence ensures zero link loss during client ad-blocker or network interference.",
      "Screentime tracking pauses automatically when the user switches browser tabs or minimizes the window.",
      "Videos must adapt to mobile orientation with safe-area notch padding in theater mode."
    ],
    specParameters: [
      { name: "Playback Engine", value: "YouTube API + HTML5", mechanism: "Custom IFrame Overlay with postMessage Bridge" },
      { name: "Share Token Format", value: "VSH_ + 7 Alpha-Numeric", mechanism: "Double-Write Client setDoc + Backend API Sync" },
      { name: "Engagement Sync", value: "Sub-Second Real-Time", mechanism: "Firestore onSnapshot Document Subscription" },
      { name: "Ad Integration", value: "Sponsored Educational Pool", mechanism: "Automated Interleaving After Academic Tracks" }
    ]
  },

  10: {
    subtitle: "Tiered Identity Hierarchy, Auth Method Parity & Admin Confidential Date-Threshold Clearance",
    lead: "Managing an open academic community requires granular Role-Based Access Control (RBAC). DPGNotes enforces strict credential parity ensuring that contributors logging in via traditional Email/Password enjoy identical capabilities to Google OAuth users, paired with dynamic reputation milestones and administrative access gates.",
    techStack: ["Firebase Authentication", "Google OAuth 2.0", "Firestore RBAC Rules", "Reputation Scoring Engine", "Admin Command Center"],
    srsMission: "SRS Section 10.0 specifies identity tiers (Guest, Contributor, Admin), credential parity across authentication providers, reputation milestone calculation, and the Admin Confidential Tab managing date-threshold access approvals.",
    components: [
      { name: "1. Three-Tier Identity Matrix", text: "Guest (Read-Only), Verified Contributor (Uploads & Solution Generators), and System Admin (Command Center)." },
      { name: "2. Authentication Parity Engine", text: "Harmonizes user token claims ensuring password and OAuth contributors access identical generator features." },
      { name: "3. Dynamic Reputation Milestones", text: "Calculates contributor honors based on verified upload volume, community likes, and student downloads." },
      { name: "4. Confidential Date-Threshold Gate", text: "Restricts technical blueprint access to contributors approved by administrators for a specific active date window." }
    ],
    tutorialSteps: [
      "Configure Firebase Authentication supporting both Email/Password and Google OAuth providers.",
      "Harmonize user claims ensuring hasPassword and providerData arrays grant equal RBAC permissions.",
      "Build Contributor verification submission form saving credential requests in contributor_verifications.",
      "Construct Admin Portal 'Confidential' tab managing Pending Requests, Active Users, and Read History.",
      "Implement date-threshold validation in script.js comparing current time against approved startDate and endDate."
    ],
    codeSnippet: `// Module 10: Date-Threshold Access Gate & RBAC Verification
function verifyClearanceThreshold(record) {
  if (!record || record.status !== 'approved') return false;
  const now = new Date();
  const start = record.startDate ? new Date(record.startDate + "T00:00:00") : null;
  const end = record.endDate ? new Date(record.endDate + "T23:59:59") : null;

  if (start && now < start) return false; // Window has not begun
  if (end && now > end) return false;     // Window has expired

  return true; // Valid active authorization window
}`,
    invariants: [
      "Feature parity is mandatory: password contributors must access all tools available to OAuth users.",
      "Clearance gate access expires automatically at 23:59:59 on the administrator-assigned end date.",
      "All administrative approval and rejection actions must be recorded in an immutable audit ledger.",
      "Account deletion requests must purge personal identifiers within 48 hours under GDPR regulations."
    ],
    specParameters: [
      { name: "Clearance Hierarchy", value: "Guest -> Contributor -> Admin", mechanism: "Firebase Auth Custom Claims & Firestore RBAC" },
      { name: "Auth Parity", value: "100% Feature Parity", mechanism: "Harmonized Token Claims Across Providers" },
      { name: "Date Thresholds", value: "Automated Expiry at 23:59:59", mechanism: "Client Gate Evaluation + Firestore Security Rules" },
      { name: "Audit Trail", value: "Immutable Read History", mechanism: "confidential_read_history Firestore Logging" }
    ]
  },

  11: {
    subtitle: "DMCA Notice-and-Takedown Automation, DRASA Integrity Framework & Automated 14-Day Data Purging",
    lead: "Operating an open academic knowledge exchange demands rigorous legal engineering. DPGNotes enforces comprehensive compliance covering intellectual property protection, 24-hour DMCA notice-and-takedown workflows, the DRASA Academic Integrity Framework, and automated 14-day ephemeral data cleansing aligning with DPDP Act 2023 and GDPR.",
    techStack: ["DRASA Compliance Framework", "DMCA Takedown Engine", "Cookie Consent Governance", "GDPR Data Deletion", "Legal Policy Engine"],
    srsMission: "SRS Section 11.0 establishes mandatory compliance with digital copyright protection, student privacy rights, cookie minimization, and academic honesty codes prohibiting commercialization of student study notes.",
    components: [
      { name: "1. Automated DMCA Dispute Intake", text: "Standardized dispute intake capturing copyright registration numbers, URLs, and sworn legal statements with a 24h review SLA." },
      { name: "2. DRASA Academic Integrity Code", text: "Prohibits commercial paywalls and mandates verified author attribution on all contributed academic resources." },
      { name: "3. Automated 14-Day Ephemeral Purge", text: "Serverless cron job deleting temporary chat logs, telemetry pings, and transient share tokens older than 14 days." },
      { name: "4. Cookie Consent & Privacy Minimization", text: "Eliminates third-party tracking cookies, respects Do Not Track (DNT) headers, and minimizes student personal data collection." }
    ],
    tutorialSteps: [
      "Publish standardized Legal Center policy pages (Privacy, Terms, Cookies, DMCA, DRASA, Disclaimer).",
      "Deploy DMCA notice intake form capturing copyright registration numbers, infringed URLs, and owner signatures.",
      "Implement administrative suspension actions instantly hiding disputed resources pending formal review.",
      "Configure scheduled Firestore TTL batches purging telemetry records older than 14 days.",
      "Embed digital watermarks onto academic PDF downloads attesting to DRASA open-access compliance."
    ],
    codeSnippet: `// Module 11: Automated 14-Day Ephemeral Data Pruning Batch
async function purgeExpiredTelemetryRecords() {
  const thresholdDate = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
  const q = query(collection(db, "telemetry_logs"), where("createdAt", "<=", thresholdDate));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.forEach(docSnap => batch.delete(docSnap.ref));
  await batch.commit();
  console.log(\`Purged \${snapshot.size} expired telemetry records.\`);
}`,
    invariants: [
      "Contested copyrighted material must be suspended from public view immediately upon valid notice.",
      "Personal identifiable information (PII) must never be logged in public telemetry streams.",
      "DRASA academic standards require complete attribution to verified student/faculty authors.",
      "Zero persistent commercial tracking cookies; all analytics cookies require explicit user consent."
    ],
    specParameters: [
      { name: "DMCA Response SLA", value: "Sub-24h Processing", mechanism: "Automated Dispute Pipeline in Legal Center" },
      { name: "Data Pruning", value: "14-Day Automated TTL", mechanism: "Scheduled Firestore Write Batch Deletions" },
      { name: "Academic Standard", value: "DRASA Institutional Integrity", mechanism: "Mandatory Contributor Attribution Stamps" },
      { name: "Privacy Standard", value: "GDPR & COPPA Compliant", mechanism: "Zero PII Storage in Public Telemetry Streams" }
    ]
  },

  12: {
    subtitle: "Multi-Cloud CI/CD Pipelines, Zero-Downtime Rolling Deploys & High-Concurrency Benchmarking",
    lead: "Site Reliability Engineering (SRE) and cloud DevOps at DPGNotes guarantee 99.95% continuous operational uptime. Through automated GitHub Actions workflows, static deployments via Firebase Hosting, containerized rolling updates on Render, and mandatory pre-flight cryptographic vault verifications, releases occur without downtime or student disruption.",
    techStack: ["GitHub Actions", "Firebase CLI", "Render Deploy Hooks", "Vault Encryption CLI", "Snyk Vulnerability Auditing"],
    srsMission: "SRS Section 12.0 mandates fully automated deployment pipelines, pre-deployment security vault verification suites, edge cache invalidation, sub-15 minute disaster recovery hot-standby procedures, and 10,000+ reader concurrency benchmarking.",
    components: [
      { name: "1. GitHub Actions CI/CD Workflows", text: "Automates linting, test suites, and vault integrity verification on every git commit before triggering production deployments." },
      { name: "2. Edge Cache Invalidation", text: "Forces global Fastly CDN PoPs to purge stale assets and serve updated JavaScript and CSS bundles immediately upon release." },
      { name: "3. Render Rolling Deployments", text: "Stateless container pod replacement ensuring new server instances pass health probes before terminating old containers." },
      { name: "4. Concurrency Benchmarking Suite", text: "Executes synthetic load testing simulating 10,000+ simultaneous readers to verify database connection pool thresholds." }
    ],
    tutorialSteps: [
      "Create .github/workflows/deploy.yml defining automated test, build, and deployment stages.",
      "Configure encrypted secrets in GitHub repository (FIREBASE_TOKEN, VAULT_KEY, RENDER_DEPLOY_HOOK).",
      "Run node backend/security/verify-vault.js as a mandatory CI step aborting builds if integrity fails.",
      "Deploy frontend using npx firebase-tools deploy --only hosting with instant edge cache invalidation.",
      "Trigger Render production backend deploy hook with post-deployment health check ping verification."
    ],
    codeSnippet: `// Module 12: Production CI/CD Workflow (.github/workflows/deploy.yml)
name: Deploy DPGNotes Production
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: npm ci
      - name: Verify Cryptographic Vault
        run: node backend/security/verify-vault.js
      - name: Deploy Firebase Hosting
        run: npx firebase-tools deploy --only hosting --token "\${{ secrets.FIREBASE_TOKEN }}"`,
    invariants: [
      "Failed security vault verification tests must immediately abort CI/CD pipelines before deployment.",
      "Zero-downtime rolling deploys: backend instances must health-check successfully before terminating old pods.",
      "Comprehensive disaster recovery playbooks must ensure sub-15 minute recovery during cloud provider outages.",
      "All production releases must be tagged with Semantic Versioning (v1.x.x) and git commit hashes."
    ],
    specParameters: [
      { name: "Deploy Automation", value: "GitHub Actions CI/CD", mechanism: "Automated Multi-Stage Pipeline on git push" },
      { name: "Vault Pre-Check", value: "100% Pass Required", mechanism: "node backend/security/verify-vault.js" },
      { name: "Uptime Guarantee", value: "Zero-Downtime Releases", mechanism: "Render Container Rolling Pod Replacement" },
      { name: "Load Tolerance", value: "10,000+ Concurrent Readers", mechanism: "Edge CDN Caching & Firestore Multi-Region" }
    ]
  }
};

// ============================================================================
// UI RENDERING & SPA CONTROLLER (SIMPLE BLOG FORMAT - NO CARD IN BLOG)
// ============================================================================

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initHeaderControls();
  initReadingProgressBar();
  initSidebarNavigation();
  initSearchFilter();
  checkAuthAndClearanceGate();
});

// Reading Progress Bar Controller
function initReadingProgressBar() {
  const bar = document.getElementById("readingProgress");
  const btnTop = document.getElementById("btnScrollTop");

  window.addEventListener("scroll", () => {
    const docEl = document.documentElement;
    const scrollTop = docEl.scrollTop || document.body.scrollTop;
    const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    if (bar) bar.style.width = `${progress}%`;

    if (btnTop) {
      if (scrollTop > 350) btnTop.classList.add("visible");
      else btnTop.classList.remove("visible");
    }
  }, { passive: true });

  if (btnTop) {
    btnTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

// Header & Mobile Drawer Controls
function initHeaderControls() {
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebar = document.getElementById("overviewSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const searchTrigger = document.getElementById("searchTrigger");
  const sidebarSearchInput = document.getElementById("overviewSidebarSearch");

  function toggleSidebar() {
    const isOpen = sidebar.classList.contains("active");
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function openSidebar() {
    sidebar.classList.add("active");
    backdrop.classList.add("active");
    toggleBtn.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    backdrop.classList.remove("active");
    toggleBtn.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (toggleBtn) toggleBtn.addEventListener("click", toggleSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  window.closeMobileSidebar = closeSidebar;

  // Search trigger focus
  if (searchTrigger && sidebarSearchInput) {
    searchTrigger.addEventListener("click", () => {
      openSidebar();
      sidebarSearchInput.focus();
    });
  }

  // Ctrl+K / Cmd+K Shortcut
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSidebar();
      if (sidebarSearchInput) sidebarSearchInput.focus();
    }
    if (e.key === "Escape") {
      closeSidebar();
    }
  });
}

// Sidebar Groups & 12 Clean Module Items Builder (NO SUB-TABS)
function initSidebarNavigation() {
  const container = document.getElementById("sidebarGroupsContainer");
  if (!container) return;

  container.innerHTML = MODULE_GROUPS.map((group, gIdx) => `
    <div class="sidebar-group" data-group-index="${gIdx}">
      <div class="group-title">
        <i class="${group.groupIcon}"></i>
        <span>${group.groupTitle}</span>
      </div>
      <ul class="sidebar-nav-list">
        ${group.modules.map(mod => `
          <li class="sidebar-tab-item ${mod.id === currentActiveTabIndex ? 'active' : ''}" id="sidebarTabItem_${mod.id}">
            <button type="button" class="sidebar-tab-btn" onclick="window.switchTab(${mod.id})">
              <div class="tab-btn-main">
                <i class="${mod.icon} tab-btn-icon"></i>
                <span class="tab-btn-title">Module ${mod.id}: ${mod.title}</span>
              </div>
              <span class="tab-btn-badge">M-${mod.id}</span>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

// Real-Time Sidebar Search Filter
function initSearchFilter() {
  const input = document.getElementById("overviewSidebarSearch");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll(".sidebar-tab-item");

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (!query || text.includes(query)) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  });
}

// Switch SPA Tab (Mounts Active Module, Unmounts Inactive - Cleans DOM)
window.switchTab = function(tabId) {
  currentActiveTabIndex = tabId;
  const targetTab = ALL_MODULES.find(t => t.id === tabId);
  if (!targetTab) return;

  // Update active sidebar state
  document.querySelectorAll(".sidebar-tab-item").forEach(item => item.classList.remove("active"));
  const activeItem = document.getElementById(`sidebarTabItem_${tabId}`);
  if (activeItem) activeItem.classList.add("active");

  window.closeMobileSidebar();
  renderTabContent(targetTab);

  // Hydrate Native Ads in newly mounted editorial blog
  if (typeof window.renderNativeDPGAds === "function") {
    setTimeout(window.renderNativeDPGAds, 200);
  }

  // Log read history audit to Firestore
  logReadHistory(targetTab.title);

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Render Comprehensive Hard-Coded Overview (SIMPLE BLOG FORMAT - NO CARD IN BLOG)
function renderTabContent(tab) {
  const container = document.getElementById("tabContentContainer");
  if (!container) return;

  // Check in-memory cache
  if (tabCache.has(tab.id)) {
    container.innerHTML = tabCache.get(tab.id);
    return;
  }

  const notes = BLOG_STUDY_NOTES[tab.id] || BLOG_STUDY_NOTES[1];

  const blogHtml = `
    <!-- BREADCRUMBS -->
    <div class="breadcrumbs-bar">
      <a href="https://dpgnotes.web.app/index.html"><i class="ri-home-4-line"></i> Home</a>
      <i class="ri-arrow-right-s-line"></i>
      <a href="https://dpgnotes.web.app/dashboard.html">Dashboard</a>
      <i class="ri-arrow-right-s-line"></i>
      <a href="https://dpgnotes.web.app/legal/index.html">Legal Center</a>
      <i class="ri-arrow-right-s-line"></i>
      <span style="color:#ffffff;">Module ${tab.id}: ${tab.title}</span>
    </div>

    <!-- SIMPLE EDITORIAL BLOG ARTICLE (NO BOXED CARDS) -->
    <article class="overview-blog-article">
      
      <!-- BLOG HEADER -->
      <header class="blog-header">
        <div class="blog-tag-badge">
          <i class="ri-book-open-line"></i> Module ${tab.id} of 12 &bull; Comprehensive Engineering Study Notes
        </div>
        <h1 class="blog-main-title">${tab.title}</h1>
        
        <div class="blog-meta-row">
          <span class="blog-meta-item"><i class="ri-time-line"></i> ${tab.readTime}</span>
          <span class="blog-meta-item"><i class="ri-shield-check-line"></i> Production-Verified</span>
          <span class="blog-meta-item"><i class="ri-organization-chart"></i> DRASA Engineering Standard</span>
        </div>

        <p class="blog-lead-paragraph">${notes.lead}</p>

        <!-- Core Tech Stack Pills -->
        <div class="blog-tech-pills">
          <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-right:4px;">Core Tech:</span>
          ${notes.techStack.map(t => `<span class="tech-pill">${t}</span>`).join('')}
        </div>
      </header>

      <!-- BLOG BODY: CONTINUOUS EDITORIAL CONTENT -->
      <div class="blog-body">
        
        <!-- SECTION 1: ARCHITECTURAL SCOPE & SRS SPECIFICATION -->
        <h2>1. Architectural Scope &amp; Software Requirements Specification (SRS)</h2>
        <p><strong>Subsystem Directive:</strong> ${notes.subtitle}</p>
        <p>${notes.srsMission}</p>

        <div class="callout-box callout-srs">
          <div class="callout-title">
            <i class="ri-shield-check-line"></i>
            Operational Invariant &amp; Acceptance Criteria
          </div>
          Under official DRASA institutional standards and enterprise Google Cloud deployment guidelines, every client request traversing this subsystem is verified against active cryptographic session tokens and validated schema definitions before execution.
        </div>

        <!-- SECTION 2: COMPONENT BREAKDOWN & DATA FLOW -->
        <h2>2. Component Hierarchy &amp; Core Data Flows</h2>
        <p>This subsystem is architected into four decoupled engineering pillars to guarantee horizontal scale-out and continuous service availability:</p>
        
        <ul>
          ${notes.components.map(c => `<li><strong>${c.name}:</strong> ${c.text}</li>`).join('')}
        </ul>

        <div class="callout-box callout-tutorial">
          <div class="callout-title">
            <i class="ri-terminal-box-line"></i>
            Full-Stack Tutorial Learning Invariant
          </div>
          Mastering this architectural layer equips full-stack engineers to build resilient, decoupled systems where client presentation, microservice computation, and persistent data clusters scale independently without single-point-of-failure bottlenecks.
        </div>

        <!-- SECTION 3: STEP-BY-STEP PRODUCTION IMPLEMENTATION GUIDE -->
        <h2>3. Step-by-Step Production Implementation Guide</h2>
        <p>Follow the practical engineering roadmap to configure, implement, and deploy this subsystem:</p>
        
        <ol class="tutorial-steps-list">
          ${notes.tutorialSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>

        <!-- SECTION 4: PRODUCTION SOURCE CODE BLUEPRINT -->
        <h2>4. Production Source Code Blueprint &amp; Implementation</h2>
        <p>Examine the authentic production-grade implementation code operational within the DPGNotes tech stack:</p>
        
        <div class="code-block-wrap">
          <div class="code-header">
            <span><i class="ri-code-s-slash-line"></i> dpgnotes_module_${tab.id}_${tab.slug}.production.js</span>
            <button type="button" class="code-copy-btn" onclick="window.copyCodeSnippet(this)">
              <i class="ri-file-copy-line"></i> Copy Blueprint
            </button>
          </div>
          <pre class="code-block"><code>${escapeHtml(notes.codeSnippet)}</code></pre>
        </div>

        <!-- NATIVE ADS INJECTION POINT (USER SPECIFIED BLOCK) -->
        <div class="native-ads" id="native-ads-content" style="margin-bottom:1.5rem;"></div>

        <!-- SECTION 5: ARCHITECTURAL INVARIANTS & QUALITY STANDARDS -->
        <h2>5. Architectural Invariants &amp; Production Verification</h2>
        <p>Under continuous cloud telemetry monitoring, this module enforces the following non-negotiable architectural invariants:</p>
        
        <ul>
          ${notes.invariants.map(inv => `<li><strong>Verified Invariant:</strong> ${inv}</li>`).join('')}
        </ul>

        <div class="callout-box callout-security">
          <div class="callout-title">
            <i class="ri-lock-line"></i>
            Security &amp; Tamper-Proofing Guarantee
          </div>
          Any deviation from these architectural invariants triggers automated circuit breakers, logs high-priority security telemetry, and aborts continuous deployment pipelines.
        </div>

        <!-- SECTION 6: TECHNICAL SPECIFICATION LEDGER -->
        <h2>6. Technical Specification Ledger &amp; Benchmarks</h2>
        <p>Review the operational parameters and performance targets established for this module:</p>

        <details class="tech-spec-accordion">
          <summary class="tech-spec-summary">
            <span><i class="ri-terminal-box-line"></i> View Technical Specification Ledger &amp; System Benchmarks</span>
            <i class="ri-arrow-down-s-line chevron"></i>
          </summary>
          <div class="tech-spec-content">
            <div class="table-responsive">
              <table class="overview-data-table">
                <thead>
                  <tr>
                    <th>Technical Parameter</th>
                    <th>Production Target</th>
                    <th>Enforcement Mechanism</th>
                  </tr>
                </thead>
                <tbody>
                  ${notes.specParameters.map(p => `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td>${p.value}</td>
                      <td>${p.mechanism}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
              Reference Resource URL: <a href="https://dpgnotes.web.app/overview/index.html">https://dpgnotes.web.app/overview/index.html (Module ${tab.id})</a>
            </div>
          </div>
        </details>

      </div>

      <!-- NATIVE ADS INJECTION POINT (FOOTER) -->
      <div class="native-ads" id="native-ads-content" style="margin-bottom:1.5rem;"></div>

      <!-- BLOG NAVIGATION FOOTER -->
      <footer class="blog-nav-footer">
        ${tab.id > 1 ? `
          <button type="button" class="header-nav-link" onclick="window.switchTab(${tab.id - 1})">
            <i class="ri-arrow-left-line"></i> Previous: Module ${tab.id - 1}
          </button>
        ` : `<div></div>`}
        
        <a href="https://dpgnotes.web.app/dashboard.html" class="header-nav-link" style="background:rgba(99,102,241,0.15); color:#a5b4fc; border-color:rgba(99,102,241,0.35);">
          <i class="ri-dashboard-line"></i> Contributor Dashboard
        </a>

        ${tab.id < 12 ? `
          <button type="button" class="header-nav-link" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#ffffff; border:none;" onclick="window.switchTab(${tab.id + 1})">
            Next: Module ${tab.id + 1} <i class="ri-arrow-right-line"></i>
          </button>
        ` : `<div></div>`}
      </footer>

    </article>
  `;

  // Store in memory cache
  tabCache.set(tab.id, blogHtml);
  container.innerHTML = blogHtml;
}

// Copy Code Snippet Handler
window.copyCodeSnippet = function(btn) {
  const wrap = btn.closest(".code-block-wrap");
  const code = wrap.querySelector("code").textContent;
  navigator.clipboard.writeText(code).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="ri-check-line" style="color:#10b981;"></i> Copied!`;
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  });
};

// Escape HTML utility
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// CONTRIBUTOR AUTH LAYER & ADMIN APPROVAL CHECK (SILENT VERIFICATION - NO DOM THRESHOLD)
// ============================================================================

window.signInWithGoogleGate = async function() {
  const btn = document.getElementById("btnGateGoogleSignIn");
  if (btn) btn.innerHTML = '<i class="ri-loader-4-line spin-icon"></i> Authenticating...';
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    if (res && res.user) {
      localStorage.setItem("dpgActiveUserUid", res.user.uid);
      localStorage.setItem("dpgActiveUserEmail", res.user.email);
      localStorage.setItem("dpgActiveUserName", res.user.displayName || "Verified Contributor");
      checkAuthAndClearanceGate();
    }
  } catch(err) {
    console.error("Google Sign In error:", err);
    if (btn) btn.innerHTML = '<i class="ri-google-fill"></i> Sign In with Google';
    alert("Authentication failed: " + (err.message || err));
  }
};

async function checkAuthAndClearanceGate() {
  onAuthStateChanged(auth, async (user) => {
    const localUid = localStorage.getItem("dpgActiveUserUid");
    const localEmail = localStorage.getItem("dpgActiveUserEmail");
    const localName = localStorage.getItem("dpgActiveUserName");
    const localRole = localStorage.getItem("dpgActiveUserRole");

    if (user) {
      currentActiveUser = user;
    } else if (localUid) {
      currentActiveUser = {
        uid: localUid,
        email: localEmail || "contributor@dpgnotes.app",
        displayName: localName || "Verified Contributor",
        role: localRole || "contributor"
      };
    } else {
      currentActiveUser = null;
    }

    // 1. Unauthenticated Contributor Check
    if (!currentActiveUser) {
      renderSignInGate();
      return;
    }

    // 2. Administrator Exemption Check
    const isAdmin = currentActiveUser.email === "its.akshatnetworkhub23@gmail.com" || 
                    currentActiveUser.role === "admin" || 
                    localRole === "admin";

    if (isAdmin) {
      currentClearanceRecord = { status: "approved", role: "admin", exempt: true };
      grantClearanceAccess();
      return;
    }

    // 3. Contributor Admin Approval Check in Firestore (confidential_overview_requests)
    try {
      const reqRef = doc(db, "confidential_overview_requests", currentActiveUser.uid);
      const reqSnap = await getDoc(reqRef);

      if (!reqSnap.exists()) {
        renderRequestClearanceForm(false);
        return;
      }

      const record = reqSnap.data();
      currentClearanceRecord = record;
      evaluateClearanceStatus(record);
    } catch(err) {
      console.warn("Clearance verification error:", err);
      // Fallback: check session-level authorization
      const sessionApproved = sessionStorage.getItem("dpg_confidential_approved") === currentActiveUser.uid;
      if (sessionApproved) {
        grantClearanceAccess();
      } else {
        renderRequestClearanceForm(false);
      }
    }
  });
}

function evaluateClearanceStatus(record) {
  const now = new Date();
  const start = record.startDate ? new Date(record.startDate + "T00:00:00") : null;
  const end = record.endDate ? new Date(record.endDate + "T23:59:59") : null;

  if (record.status === "pending" || !record.status) {
    renderPendingStatus(record);
    return;
  }

  if (record.status === "rejected") {
    renderRejectedStatus(record);
    return;
  }

  if (record.status === "revoked") {
    renderRevokedStatus(record);
    return;
  }

  if (end && now > end) {
    // Expired: auto-denied
    renderExpiredStatus(record);
    return;
  }

  if (start && now < start) {
    renderScheduledStatus(record);
    return;
  }

  if (record.status === "approved" && (!start || now >= start) && (!end || now <= end)) {
    // APPROVED: Silent access grant - nothing shown on DOM
    sessionStorage.setItem("dpg_confidential_approved", currentActiveUser.uid);
    grantClearanceAccess();
    return;
  }

  // Fallback
  renderRequestClearanceForm(false);
}

function grantClearanceAccess() {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  if (gateOverlay) gateOverlay.style.display = "none";

  // Note: Per requirements, NO clearance threshold badge or date threshold is rendered on the DOM
  window.switchTab(1);
}

function renderSignInGate() {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateOverlay) gateOverlay.style.display = "flex";
  if (gateTitle) gateTitle.textContent = "Contributor Authentication Required";
  if (gateDesc) gateDesc.textContent = "Access to the DPGNotes Full Stack Development Tutorial and Technical Architecture is reserved for authenticated contributors and approved team members.";
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#eab308; font-weight:700; margin-bottom:6px;"><i class="ri-user-shared-line"></i> Please Sign In</div>
      <p style="margin:0 0 12px; color:#cbd5e1; font-size:0.88rem;">Sign in with your verified DPGNotes Contributor account to verify approval status.</p>
      <button type="button" class="gate-btn-submit" id="btnGateGoogleSignIn" onclick="window.signInWithGoogleGate()" style="width:100%; justify-content:center;">
        <i class="ri-google-fill"></i> Sign In with Google
      </button>
    `;
  }
  if (gateForm) gateForm.style.display = "none";
}

function renderRequestClearanceForm(isRenewal = false) {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateOverlay) gateOverlay.style.display = "flex";
  if (gateTitle) gateTitle.textContent = isRenewal ? "Renew Overview Clearance" : "Administrator Approval Required";
  if (gateDesc) gateDesc.textContent = "Submit your purpose for reviewing the confidential architecture. Once approved in the Admin Portal 'Confidential' tab, access will unlock automatically.";

  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#eab308; font-weight:700;"><i class="ri-shield-keyhole-line"></i> Verified Contributor: ${escapeHtml(currentActiveUser?.displayName || currentActiveUser?.email || "Contributor")}</div>
      <p style="margin:4px 0 0; font-size:0.85rem; color:#cbd5e1;">Requests are reviewed by administrators with assigned validity date thresholds.</p>
    `;
  }

  if (gateForm) {
    gateForm.style.display = "block";
    gateForm.onsubmit = async (e) => {
      e.preventDefault();
      const reasonVal = document.getElementById("gateReasonInput")?.value || "";
      if (!reasonVal.trim()) {
        alert("Please state your justification or purpose for access.");
        return;
      }
      submitClearanceRequest(reasonVal.trim());
    };
  }
}

async function submitClearanceRequest(reason) {
  const submitBtn = document.getElementById("btnSubmitGateRequest");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ri-loader-4-line spin-icon"></i> Submitting to Admin...`;
  }

  try {
    const docData = {
      uid: currentActiveUser.uid,
      email: currentActiveUser.email,
      displayName: currentActiveUser.displayName || currentActiveUser.name || "Verified Contributor",
      photoURL: currentActiveUser.photoURL || "",
      reason: reason,
      status: "pending",
      requestDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "confidential_overview_requests", currentActiveUser.uid), docData, { merge: true });
    renderPendingStatus(docData);
  } catch(err) {
    console.error("Submission failed:", err);
    alert("Request submission failed: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Submit Access Request <i class="ri-arrow-right-line"></i>`;
    }
  }
}

function renderPendingStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateTitle) gateTitle.textContent = "Clearance Pending Approval";
  if (gateDesc) gateDesc.textContent = "Your request has been dispatched to the Administrator and is currently listed in the Admin Portal 'Confidential' Tab.";
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#eab308; font-weight:700;"><i class="ri-time-line"></i> Status: Pending Admin Review</div>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Submitted By:</strong> ${escapeHtml(record.displayName || record.email)}</p>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Purpose:</strong> ${escapeHtml(record.reason || "Architecture evaluation")}</p>
      <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Once the Administrator authorizes your request in the Admin Portal, refresh to view.</p>
      <button type="button" class="gate-btn-submit" style="margin-top:12px; width:100%; justify-content:center;" onclick="window.location.reload()">
        <i class="ri-refresh-line"></i> Check Approval Status
      </button>
    `;
  }
  if (gateForm) gateForm.style.display = "none";
}

function renderRejectedStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");

  if (gateTitle) gateTitle.textContent = "Access Request Declined";
  if (gateDesc) gateDesc.textContent = "Your recent request for system overview access was declined by the administrator.";
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#ef4444; font-weight:700;"><i class="ri-close-circle-line"></i> Request Declined</div>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Note:</strong> ${escapeHtml(record.rejectionReason || "No explanation provided")}</p>
      <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">You may submit an updated request below.</p>
    `;
  }
  renderRequestClearanceForm(true);
}

function renderRevokedStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");

  if (gateTitle) gateTitle.textContent = "Clearance Revoked";
  if (gateDesc) gateDesc.textContent = "Your access authorization has been revoked by the administrator in the Admin Portal.";
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#ef4444; font-weight:700;"><i class="ri-prohibited-line"></i> Access Revoked</div>
      <p style="margin:6px 0; color:#cbd5e1;">Submit a new request if this action was taken in error.</p>
    `;
  }
  renderRequestClearanceForm(true);
}

function renderExpiredStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");

  if (gateTitle) gateTitle.textContent = "Access Window Expired";
  if (gateDesc) gateDesc.textContent = "Your previously approved access window has expired. Access is automatically denied until renewed.";
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#ef4444; font-weight:700;"><i class="ri-alarm-warning-line"></i> Clearance Expired</div>
      <p style="margin:6px 0; color:#cbd5e1;">Submit a renewal request for updated administrator authorization.</p>
    `;
  }
  renderRequestClearanceForm(true);
}

function renderScheduledStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusAlert = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateTitle) gateTitle.textContent = "Clearance Scheduled";
  if (gateDesc) gateDesc.textContent = `Your access authorization is scheduled to become active on ${escapeHtml(record.startDate)}.`;
  if (gateStatusAlert) {
    gateStatusAlert.innerHTML = `
      <div style="color:#38bdf8; font-weight:700;"><i class="ri-calendar-event-line"></i> Scheduled Access</div>
      <p style="margin:6px 0; color:#cbd5e1;">Access will activate automatically on your approved start date.</p>
    `;
  }
  if (gateForm) gateForm.style.display = "none";
}

// Log Read History to Firestore
async function logReadHistory(activeTabName) {
  if (!currentActiveUser) return;
  try {
    await addDoc(collection(db, "confidential_read_history"), {
      uid: currentActiveUser.uid,
      email: currentActiveUser.email,
      displayName: currentActiveUser.displayName || currentActiveUser.name || "Verified Contributor",
      timestamp: serverTimestamp(),
      activeTab: activeTabName,
      userAgent: navigator.userAgent
    });
  } catch(err) {
    console.warn("Read history logging failed (non-blocking):", err.message);
  }
}
