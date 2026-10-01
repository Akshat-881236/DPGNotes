/**
 * DPGNotes Project-Based FSD Tutorial, SRS Overview & Technical Blueprint
 * Script: script.js (12 Standalone Modules Architecture - Without Sub-Tabs)
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

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
// 12 STANDALONE MODULE DEFINITIONS (NO SUB-TABS)
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
        readTime: "12 min read",
        desc: "Master Full Stack 3-tier system design: Edge CDN routing, client-server topology, serverless triggers, and high-availability SRS requirements."
      },
      {
        id: 2,
        slug: "frontend",
        title: "Frontend Engineering & UI Component Hierarchy",
        icon: "ri-layout-masonry-line",
        readTime: "14 min read",
        desc: "In-depth Vanilla JS component architecture, CSS custom properties, responsive breakpoints, foldable device support, and progressive hydration."
      },
      {
        id: 3,
        slug: "backend-api",
        title: "Express Backend, Server API Endpoints & Microservices",
        icon: "ri-server-line",
        readTime: "15 min read",
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
        readTime: "13 min read",
        desc: "Automated media transformation pipelines, dynamic cover page rendering, signed uploads, and low-bandwidth asset optimization."
      },
      {
        id: 5,
        slug: "database-schema",
        title: "Cloud Firestore Real-Time Database & Data Modeling",
        icon: "ri-database-line",
        readTime: "14 min read",
        desc: "Complete NoSQL schema design, collections and subcollections, denormalization, Firestore security rules, and atomic transactions."
      },
      {
        id: 6,
        slug: "security-vault",
        title: "Cryptographic Vault & AES-256-GCM Security Engine",
        icon: "ri-shield-keyhole-line",
        readTime: "15 min read",
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
        readTime: "13 min read",
        desc: "Tiered multi-model architecture: Google Gemini 1.5/2.0 Pro/Flash priority cascade with automatic fallback to xAI Grok."
      },
      {
        id: 8,
        slug: "search-engine",
        title: "High-Performance Search & SERP Ranking Algorithms",
        icon: "ri-search-eye-line",
        readTime: "12 min read",
        desc: "Lexical & semantic search engine, tokenization, multi-field weighted scoring, CTR feedback loops, and sub-50ms query benchmarks."
      },
      {
        id: 9,
        slug: "video-ecosystem",
        title: "Educational Media Studio & Video Ecosystem",
        icon: "ri-video-line",
        readTime: "11 min read",
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
        readTime: "12 min read",
        desc: "User identity hierarchy, auth parity (Password & Google OAuth), clearance levels, reputation scoring, and the Admin Confidential Tab."
      },
      {
        id: 11,
        slug: "legal-compliance",
        title: "Legal Center, DMCA, Privacy & Compliance Policies",
        icon: "ri-scales-3-line",
        readTime: "14 min read",
        desc: "Official legal governance: DMCA notice-and-takedown workflow, DRASA framework, automated 14-day ephemeral data cleansing, and privacy."
      },
      {
        id: 12,
        slug: "devops-cicd",
        title: "DevOps, Cloud Deployment & CI/CD Telemetry",
        icon: "ri-git-branch-line",
        readTime: "12 min read",
        desc: "Multi-cloud architecture (Firebase Hosting + Render Node.js), GitHub Actions CI/CD automation, secrets vault lifecycle, and monitoring."
      }
    ]
  }
];

// Flatten all 12 modules
export const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

// ============================================================================
// HARD-CODED DETAILED & CONCISE OVERVIEWS FOR ALL 12 TABS
// ============================================================================
const HARDCODED_TAB_OVERVIEWS = {
  1: {
    srsSection: "SRS Section 1.0 — Architecture & Topography",
    mission: "Establish an enterprise-grade 3-tier hybrid cloud topology decoupling presentation, compute, and persistence layers. The platform bridges syllabus lectures with exam mastery across 8 academic streams (SE, SP, UE, EV, T&N, IQ, A&LR, PQ) with zero paywalls, complete attribution, and cryptographic integrity.",
    techStack: ["Node.js 20 LTS", "Express.js", "Firebase Hosting", "Cloud Firestore", "Render Cloud", "Fastly CDN", "TLS 1.3"],
    deliverables: [
      "Decouple client SPA, stateless backend microservices, and multi-region NoSQL persistence.",
      "Configure global Edge CDN reverse proxy routing with immutable caching headers.",
      "Implement circuit breakers and automated keep-alive telemetry to prevent server cold starts.",
      "Verify cross-region disaster recovery failovers compliant with DRASA governance standards."
    ],
    components: [
      { title: "Presentation Layer (Client SPA)", desc: "Served via Google Firebase Hosting edge PoPs over HTTP/3 with automatic Brotli compression and TLS 1.3 certificate management." },
      { title: "Compute Microservices (Express Engine)", desc: "Stateless containerized Node.js service on Render load-balanced with strict trust-proxy configuration." },
      { title: "Persistence Backbone (Cloud Firestore)", desc: "Distributed NoSQL database configured in multi-region eur3 clusters providing sub-50ms query responses." },
      { title: "Edge Proxy & CORS Gateway", desc: "Edge routing (/api/** -> Render) with domain-whitelisted CORS headers prohibiting unauthenticated origins." }
    ],
    tutorialSteps: [
      "Define the system topography in firebase.json mapping client requests to edge CDN buckets and proxying /api/** to Render.",
      "Bootstrap the Express server with helmet, cors, and express-rate-limit middleware to eliminate OWASP Top 10 vulnerabilities.",
      "Initialize Firebase Admin SDK with decrypted service account credentials derived from in-memory environment secrets.",
      "Register an automated health check probe (/api/health) monitored by uptime pings every 10 minutes to prevent cold starts.",
      "Deploy static assets with immutable cache-control headers (max-age=31536000) for sub-100ms repeat visits."
    ],
    codeSnippet: `// Module 1: Production 3-Tier Express Gateway & Health Probe
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

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
    clearanceTier: 'LEVEL_3_CONFIDENTIAL'
  });
});`,
    invariants: [
      "Edge reverse proxy latency must remain below 15ms under standard network conditions.",
      "Zero unauthenticated bypass of API gateways; state-mutating requests require validated tokens.",
      "All metric increments execute atomically via Firestore increment(1) to eliminate race conditions.",
      "Full compliance with DRASA academic open-access standards and continuous telemetry auditing."
    ],
    specParameters: [
      { name: "Operational SLA", value: "99.95% Continuous Uptime", mechanism: "Multi-Region Edge Failover & Health Probes" },
      { name: "Network Protocol", value: "HTTP/3 & TLS 1.3", mechanism: "Automated Google Cloud SSL Lifecycle" },
      { name: "Cold Start Defense", value: "Sub-Second Recovery", mechanism: "Automated Micro-Daemon Keep-Alive Pings" },
      { name: "Data Encryption", value: "AES-256-GCM + TLS 1.3", mechanism: "In-Memory Vault & Strict HSTS Enforcements" }
    ]
  },

  2: {
    srsSection: "SRS Section 2.0 — Frontend Engineering & Responsive Design",
    mission: "Deliver a blazing-fast, framework-free client experience in modern Vanilla JavaScript and semantic CSS. The interface adapts seamlessly from 280px foldable screens to 4K desktop displays with glassmorphism aesthetics, in-memory PDF canvas watermarking, and zero native blocking dialogs.",
    techStack: ["Vanilla JavaScript (ES6+)", "CSS Custom Properties", "PDF.js Canvas Engine", "Service Worker (PWA)", "Web Storage API"],
    deliverables: [
      "Construct a zero-framework component architecture with modular lifecycle management.",
      "Implement fluid responsive layouts supporting 280px foldables up to 4K displays with zero horizontal overflow.",
      "Deploy custom asynchronous modal framework replacing all native alert(), confirm(), and prompt() dialogs.",
      "Render academic PDFs on HTML5 Web Canvas with dynamic in-memory contributor watermarking."
    ],
    components: [
      { title: "Design System & CSS Tokens", desc: "Centralized :root variables governing Outfit/Inter typography, surface glassmorphism, and color contrast." },
      { title: "Fluid Breakpoint Engine", desc: "Clamp-based responsive layouts adapting to foldables (280px-340px), mobile (427px Pixel 9), and tablets." },
      { title: "Custom Dialog Framework", desc: "Promise-based customAlert and customConfirm modals preventing main-thread UI execution locking." },
      { title: "PDF.js Dynamic Watermarking", desc: "In-memory canvas rendering engine overlaying contributor attribution and DRM timestamps on document pages." }
    ],
    tutorialSteps: [
      "Declare semantic CSS custom properties in :root for consistent colors, elevations, and typographic scales.",
      "Construct modular JavaScript controllers with explicit mount, render, and destroy lifecycle hooks.",
      "Implement an asynchronous modal dialog framework (custom-dialogs.js) returning Promises for clean async/await flows.",
      "Attach debounced resize and orientation listeners to toggle off-canvas drawers and adjust touch target paddings.",
      "Configure PDF.js canvas render pipelines to composite attribution stamps dynamically during page rasterization."
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
    srsSection: "SRS Section 3.0 — Backend Microservices & REST Endpoints",
    mission: "Power high-volume educational transactions with a 12-factor Node.js / Express microservice cluster hosted on Render. Handles token validation, document ingestion, Brevo SMTP transactional emails, AI proxying, and comprehensive telemetry dispatching.",
    techStack: ["Node.js 20 LTS", "Express.js", "Firebase Admin SDK", "JWT Authentication", "Brevo SMTP API", "express-rate-limit"],
    deliverables: [
      "Construct stateless REST microservices adhering to 12-factor application principles.",
      "Implement dual token validation with Firebase Admin SDK and signed session cookies.",
      "Deploy express-rate-limit protection to safeguard public routes against denial-of-service abuse.",
      "Integrate Brevo SMTP transactional email pipelines with strict anti-spam notification controls."
    ],
    components: [
      { title: "Authentication Middleware", desc: "Validates incoming Bearer tokens using admin.auth().verifyIdToken() and injects verified claims." },
      { title: "Document Management API", desc: "Validates uploaded study material metadata and issues Cloudinary signed upload credentials." },
      { title: "AI Proxy Gateway", desc: "Dispatches academic queries to Gemini and Grok with token limiting and Server-Sent Events (SSE)." },
      { title: "Transactional Mailer", desc: "Transmits 2FA codes, password resets, and verification emails while suppressing non-critical notifications." }
    ],
    tutorialSteps: [
      "Initialize Express application setting trust-proxy for Render reverse-proxy load balancers.",
      "Attach helmet security headers and express.json body parsers enforcing 10MB payload thresholds.",
      "Register authentication middleware verifying Firebase Admin ID tokens on all protected endpoints.",
      "Build modular route handlers (/api/documents, /api/ai/query, /api/share/generate-video).",
      "Configure Brevo SMTP mail dispatchers wrapped in rate-limiting circuit breakers to prevent email flooding."
    ],
    codeSnippet: `// Module 3: Firebase Admin Token Verification & API Middleware
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
    srsSection: "SRS Section 4.0 — Cloudinary Media Pipeline & PDF Engine",
    mission: "Automate the transformation, storage, and secure delivery of academic study materials. Uploaded PDF documents undergo page counting, high-DPI canvas front cover synthesis, contributor attribution watermarking, and bandwidth-optimized CDN delivery.",
    techStack: ["Cloudinary Node.js SDK", "PDF-Lib", "HTML5 Canvas API", "Brotli Compression", "Signed Direct Uploads"],
    deliverables: [
      "Automate serverless thumbnail generation and high-DPI cover page synthesis.",
      "Embed dynamic DRM watermarks onto academic PDF documents in-memory prior to download.",
      "Optimize bandwidth consumption via Cloudinary adaptive formats (f_auto, q_auto).",
      "Implement signed direct-to-cloud client uploads bypassing intermediate server bottlenecks."
    ],
    components: [
      { title: "Signed Upload Strategy", desc: "Generates ephemeral SHA-1 upload signatures on the backend so clients upload directly to Cloudinary." },
      { title: "Thumbnail Generator", desc: "Downscales uploaded front pages into optimized 400x300 previews for SERP and home card grids." },
      { title: "PDF Parsing Engine", desc: "Extracts document page counts, table-of-contents metadata, and validates PDF MIME headers." },
      { title: "DRM Watermark Compositor", desc: "Overlays dynamic student attribution, timestamp, and DRASA verification seals onto document pages." }
    ],
    tutorialSteps: [
      "Initialize Cloudinary Node.js SDK with API key, secret, and cloud name credentials.",
      "Create /api/cloudinary/sign endpoint generating cryptographic SHA-1 upload signatures for verified contributors.",
      "Configure client upload handlers to push directly to Cloudinary API with upload progress telemetry.",
      "Synthesize front cover thumbnails using Cloudinary URL transformations (w_400,h_300,c_fill,q_auto,f_auto).",
      "Integrate PDF-Lib to watermark downloaded documents dynamically with contributor name and DRASA seal."
    ],
    codeSnippet: `// Module 4: Cloudinary Signed Upload Signature Generator
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
    srsSection: "SRS Section 5.0 — Cloud Firestore Database & Schema",
    mission: "Engineer a high-throughput, multi-region NoSQL database architecture on Google Cloud Firestore. Supports high-velocity read workloads with denormalized document schemas, real-time reactive snapshot listeners (onSnapshot), compound indexing, and atomic transaction counters.",
    techStack: ["Google Cloud Firestore", "NoSQL Data Modeling", "Security Rules Engine", "Compound Indexing", "ACID Transactions"],
    deliverables: [
      "Architect high-throughput NoSQL schemas balancing normalization with read speeds.",
      "Deploy atomic transaction counters to eliminate concurrency race conditions.",
      "Automate 14-day ephemeral data cleansing using Firestore TTL mechanisms.",
      "Enforce granular Firestore security rules restricting write permissions to verified owners."
    ],
    components: [
      { title: "Root Collections", desc: "users, documents, share_links, videos, user_ads, and confidential_overview_requests." },
      { title: "Denormalized Indices", desc: "Author metadata, stream codes, and semester tags embedded directly on resource records." },
      { title: "Atomic Metrics Engine", desc: "Executes increment(1) operations for views, clicks, shares, and likes without read-modify-write lag." },
      { title: "Real-Time Listeners", desc: "Binds client interfaces to onSnapshot streams for instantaneous peer chat and like synchronization." }
    ],
    tutorialSteps: [
      "Define root collections in Firestore: users, documents, share_links, videos, user_ads, and audit ledgers.",
      "Configure compound indexes in firestore.indexes.json for complex queries (stream + discipline + createdAt).",
      "Deploy granular Firestore security rules prohibiting unauthenticated writes and enforcing field validation.",
      "Implement atomic metric updates using Firestore increment(1) to avoid write concurrency collisions.",
      "Configure automated TTL policies to delete temporary telemetry logs and share tokens older than 14 days."
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
    srsSection: "SRS Section 6.0 — Cryptographic Vault & AES-256-GCM Engine",
    mission: "Protect proprietary business logic, AI orchestration prompts, and server source code through the Cryptographic Vault. The Express server source is compiled into an authenticated AES-256-GCM ciphertext file (server.payload.enc) and executed entirely in RAM via Node's V8 VM sandbox.",
    techStack: ["Node.js crypto Module", "AES-256-GCM", "PBKDF2 Key Derivation", "V8 VM Sandboxed Execution", "HMAC-SHA256"],
    deliverables: [
      "Compile proprietary server source into authenticated AES-256-GCM ciphertexts.",
      "Execute decrypted bytecode directly in memory without creating temporary plaintext disk files.",
      "Deploy hardware-accelerated tamper detection circuit breakers that terminate on bit-flip corruption.",
      "Execute the automated verify-vault.js test suite across all 5 security test suites before deployment."
    ],
    components: [
      { title: "Vault CLI Builder (vault.js)", desc: "Build tool that hashes server.source.js, derives 256-bit AES keys, and emits server.payload.enc." },
      { title: "PBKDF2 Key Derivation", desc: "Derives encryption keys from master secret using 100,000 iterations and cryptographic salt." },
      { title: "AES-256-GCM Cipher Engine", desc: "Provides authenticated encryption with a 128-bit authentication tag detecting any ciphertext tampering." },
      { title: "In-Memory V8 VM Sandbox", desc: "Compiles decrypted JavaScript strings directly into V8 execution contexts without disk footprint." }
    ],
    tutorialSteps: [
      "Configure backend/security/vault.js CLI tool with PBKDF2 key derivation (100,000 iterations, SHA-256).",
      "Read backend/server.source.js into a memory buffer and compute its SHA-256 integrity digest.",
      "Encrypt buffer using crypto.createCipheriv('aes-256-gcm', key, iv) and extract the 128-bit auth tag.",
      "Write ciphertext, IV, and auth tag into backend/server.payload.enc and verify bit-for-bit with verify-vault.js.",
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
    srsSection: "SRS Section 7.0 — Multi-Engine AI Orchestration & Fallback",
    mission: "Deploy a resilient multi-model Artificial Intelligence gateway powering the Legal Center AI Advisor, PDF Document Summarizer, and Assignment Solution Generator. Prioritizes Google Gemini 2.0/1.5 Pro and Flash with automated fallback to xAI Grok upon quota exhaustion or latency spikes.",
    techStack: ["Google Gemini 2.0 / 1.5 Pro & Flash", "xAI Grok API", "Server-Sent Events (SSE)", "DOMPurify", "Marked.js"],
    deliverables: [
      "Orchestrate resilient multi-LLM fallback pipelines (Gemini Pro -> Flash -> Grok).",
      "Engineer context-aware system prompts enforcing academic integrity boundaries.",
      "Stream sanitized Markdown responses via Server-Sent Events with zero XSS vulnerability.",
      "Implement automatic token cost controls, prompt truncation safeguards, and error circuit breakers."
    ],
    components: [
      { title: "Tiered Model Cascade", desc: "Priority 1: Gemini 2.0 Pro -> Priority 2: Gemini 1.5 Flash -> Priority 3: xAI Grok Fallback." },
      { title: "Legal Center AI Advisor", desc: "Specialized system prompt grounding responses in official DPGNotes policies and DRASA regulations." },
      { title: "PDF Chunk Summarizer", desc: "Splits large academic notes into semantic chunks for real-time chapter summaries and key formulas." },
      { title: "XSS Defense Pipeline", desc: "Passes all AI Markdown strings through DOMPurify before hydrating browser component containers." }
    ],
    tutorialSteps: [
      "Configure Google Gemini API client with API key and system instruction grounding responses in academic curricula.",
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
    srsSection: "SRS Section 8.0 — Search Engine & SERP Algorithms",
    mission: "Architect an academic search engine delivering sub-50ms search results across thousands of study materials. Combines client-side memory trie autocomplete, server-side lexical tokenization, multi-field weighted scoring formulas, and CTR telemetry boosting.",
    techStack: ["Lexical Tokenizer", "Inverted Index Trie", "TF-IDF Scoring Formula", "OpenGraph Protocol", "Debounced Autocomplete"],
    deliverables: [
      "Develop client-side debounced search suggestion trie with sub-10ms latency.",
      "Implement multi-field weighted relevance scoring boosted by user CTR feedback.",
      "Architect faceted SERP navigation across disciplines, semesters, and document types.",
      "Optimize OpenGraph metadata and dynamic sitemap.xml generation for search bot indexing."
    ],
    components: [
      { title: "Query Ingestion & Stemming", desc: "Strips punctuation, normalizes case, and expands academic synonyms (e.g. 'DSA' -> 'Data Structures')." },
      { title: "Weighted Relevance Formula", desc: "Title Match: 50pts, Subject Match: 30pts, Stream Match: 20pts, Description: 10pts." },
      { title: "CTR Feedback Boosting", desc: "Increases document ranking score by 10% for every 100 verified reader clicks." },
      { title: "SERP Tabbed Navigation", desc: "Categorizes results into All, AI Overview, Lecture Notes, Practical Solutions, and Videos." }
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
    srsSection: "SRS Section 9.0 — Video Ecosystem & Streaming Player",
    mission: "Build an educational video streaming ecosystem featuring a dual HTML5 and YouTube IFrame player engine, full-screen theater mode, academic syllabus lectures, sponsored educational partner ads, and ephemeral VSH_ share link generation.",
    techStack: ["YouTube IFrame API", "HTML5 Media Player", "Firestore Real-Time Sync", "Web Share API", "Double-Write Pattern"],
    deliverables: [
      "Integrate dual HTML5/YouTube playback engine with full-screen theater mode.",
      "Interleave curated syllabus lectures with sponsored educational university ads.",
      "Guarantee share link persistence via simultaneous client setDoc and backend dispatch.",
      "Implement screentime retention auditing and real-time like/view synchronization."
    ],
    components: [
      { title: "Dual Player Engine", desc: "Bridges HTML5 video controls with YouTube IFrame Player API using postMessage events." },
      { title: "Pool Switching Mechanism", desc: "Seamlessly toggles between academic syllabus videos and approved sponsored educational ads." },
      { title: "Double-Write Share Generator", desc: "Writes to Firestore share_links via setDoc and dispatches redundant POST /api/share/generate-video." },
      { title: "Mobile Orientation Controller", desc: "Locks fullscreen video player to landscape mode on supported mobile devices." }
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
    srsSection: "SRS Section 10.0 — Contributor RBAC & Clearance Governance",
    mission: "Enforce complete authentication parity between email/password and OAuth sign-in methods, manage contributor reputation milestones, and implement administrative access gates in the Admin Confidential Tab with date-threshold access approvals.",
    techStack: ["Firebase Authentication", "Google OAuth 2.0", "Firestore RBAC Rules", "Reputation Scoring Engine", "Admin Command Center"],
    deliverables: [
      "Enforce authentication parity between traditional email/password and OAuth providers.",
      "Implement Contributor verification workflows with automated reputation milestone badges.",
      "Build Admin Confidential Tab CRUD with date-threshold access gates and automatic expiry.",
      "Safeguard user privacy with GDPR-compliant right-to-be-forgotten account purge routines."
    ],
    components: [
      { title: "Identity Tiers", desc: "Guest (Read-Only), Verified Contributor (Upload & Generate), and System Admin (Command Center)." },
      { title: "Auth Parity Matrix", desc: "Ensures solution generation and profile features work identically across all sign-in methods." },
      { title: "Reputation Engine", desc: "Computes scores based on verified document uploads, peer ratings, and study community impact." },
      { title: "Confidential Access Gate", desc: "Restricts technical blueprint access to contributors approved for a specific date window." }
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
    srsSection: "SRS Section 11.0 — Legal Compliance, DMCA & DRASA Framework",
    mission: "Enforce institutional legal governance, DMCA notice-and-takedown workflows, academic open-access terms of service, PII minimization, cookie consent rules, and the DRASA Academic Integrity Framework.",
    techStack: ["DRASA Compliance Framework", "DMCA Takedown Engine", "Cookie Consent Governance", "GDPR Data Deletion", "Legal Policy Engine"],
    deliverables: [
      "Construct automated DMCA notice-and-takedown workflow with attribution tracking.",
      "Deploy automated 14-day ephemeral data cleansing for privacy compliance.",
      "Embed DRASA academic integrity standards across all contributed study materials.",
      "Maintain transparent commercial advertising policies and external link disclaimers."
    ],
    components: [
      { title: "DMCA Takedown Engine", desc: "Automated dispute pipeline allowing copyright holders to submit verified claims with 24h response SLAs." },
      { title: "DRASA Integrity Code", desc: "Prohibits commercial monetization of student notes and mandates open-access academic sharing." },
      { title: "Ephemeral Data Cleansing", desc: "Automated serverless cron job purging temporary chat histories and tracking tokens after 14 days." },
      { title: "Cookie Governance Rules", desc: "Restricts cookies to strictly necessary session tokens while respecting Do Not Track (DNT) headers." }
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
    srsSection: "SRS Section 12.0 — DevOps, CI/CD & Cloud Telemetry",
    mission: "Deploy enterprise DevOps practices spanning Firebase Hosting and Render Node.js microservices. Automated GitHub Actions CI/CD workflows, vault security verification test runner, zero-downtime rolling deploys, edge cache invalidation, and 10,000+ reader concurrency benchmarking.",
    techStack: ["GitHub Actions", "Firebase CLI", "Render Deploy Hooks", "Vault Encryption CLI", "Snyk Vulnerability Auditing"],
    deliverables: [
      "Automate multi-cloud deployment pipelines for static hosting and backend microservices.",
      "Integrate cryptographic vault verification into CI test suites before deployment.",
      "Conduct 10,000+ reader concurrency benchmarking and zero-downtime disaster recovery drills.",
      "Enforce semantic versioning (SemVer) with automated release rollbacks during health failures."
    ],
    components: [
      { title: "GitHub Actions CI/CD", desc: "Automated pipeline executing npm test, verify-vault.js, and firebase deploy on git push." },
      { title: "Edge Cache Invalidation", desc: "Forces global CDN PoP cache refresh on new static frontend deployment releases." },
      { title: "Render Rolling Updates", desc: "Zero-downtime container replacement ensuring new server instances pass health probes before cutover." },
      { title: "Disaster Recovery Playbook", desc: "Hot-standby configuration allowing database and static hosting migration in under 15 minutes." }
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
// UI RENDERING & SPA CONTROLLER (LEGAL CENTER ARCHITECTURE - 12 CLEAN TABS)
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
                <span class="tab-btn-title">Tab ${mod.id}: ${mod.title}</span>
              </div>
              <span class="tab-btn-badge">T-${mod.id}</span>
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

  // Log read history audit to Firestore
  logReadHistory(targetTab.title);

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Render Comprehensive Hard-Coded Overview for Active Module (NO SUB-TABS)
function renderTabContent(tab) {
  const container = document.getElementById("tabContentContainer");
  if (!container) return;

  // Check in-memory cache
  if (tabCache.has(tab.id)) {
    container.innerHTML = tabCache.get(tab.id);
    return;
  }

  const tabData = HARDCODED_TAB_OVERVIEWS[tab.id] || HARDCODED_TAB_OVERVIEWS[1];

  const fullTabHtml = `
    <!-- BREADCRUMBS -->
    <div class="breadcrumbs-bar">
      <a href="https://dpgnotes.web.app/index.html"><i class="ri-home-4-line"></i> Home</a>
      <i class="ri-arrow-right-s-line"></i>
      <a href="https://dpgnotes.web.app/dashboard.html">Dashboard</a>
      <i class="ri-arrow-right-s-line"></i>
      <a href="https://dpgnotes.web.app/legal/index.html">Legal Center</a>
      <i class="ri-arrow-right-s-line"></i>
      <span style="color:#ffffff;">Tab ${tab.id}: ${tab.title}</span>
    </div>

    <!-- MODULE BANNER HERO CARD WITH EXECUTIVE ARCHITECTURE OVERVIEW -->
    <div class="tab-banner-card">
      <div class="tab-banner-meta">
        <span class="tab-index-badge">Module Tab ${tab.id} of 12</span>
        <span class="badge-clearance"><i class="ri-shield-keyhole-line"></i> Level-3 Confidential</span>
        <span class="tab-read-time"><i class="ri-time-line"></i> ${tab.readTime}</span>
      </div>
      <h1 class="tab-main-title">${tab.title}</h1>
      
      <!-- Executive Architecture Overview Card -->
      <div class="module-overview-box">
        <div class="module-overview-heading">
          <i class="ri-compass-3-line"></i>
          <span>Executive Architectural Mission &amp; SRS Scope</span>
        </div>
        <p class="module-overview-text">${tabData.mission}</p>
        
        <!-- Core Tech Stack Pills -->
        <div class="module-tech-stack">
          <span class="tech-stack-label">Core Tech Stack:</span>
          ${tabData.techStack.map(t => `<span class="tech-pill">${t}</span>`).join('')}
        </div>

        <!-- Key SRS Milestones -->
        <div class="module-deliverables">
          <div class="deliverables-title"><i class="ri-checkbox-circle-fill" style="color:var(--color-success);"></i> Key SRS Milestones &amp; Learning Objectives:</div>
          <ul class="deliverables-list">
            ${tabData.deliverables.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- SECTION 1: ARCHITECTURAL SPECIFICATION & SRS REQUIREMENTS -->
    <article class="overview-section">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">1.0</span>
          <span>Architectural Scope &amp; Software Requirements Specification (SRS)</span>
        </h2>
        <div class="section-badges-group">
          <span class="section-badge badge-srs">SRS-M${tab.id}-CORE</span>
          <span class="section-badge badge-tech">ARCHITECTURE</span>
        </div>
      </div>
      <div class="section-body">
        <h3 class="subheading"><i class="ri-file-list-3-line"></i> ${tabData.srsSection}</h3>
        <p>${tabData.mission}</p>

        <div class="callout-box callout-srs">
          <div class="callout-title">
            <i class="ri-shield-check-line"></i>
            SRS Operational Invariant &amp; Acceptance Standard
          </div>
          Every request traversing this subsystem is subjected to real-time verification against active cryptographic clearance tokens, rigorous schema definitions, and DRASA institutional compliance regulations.
        </div>
      </div>
    </article>

    <!-- SECTION 2: COMPONENT BREAKDOWN & CORE DATA FLOW -->
    <article class="overview-section">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">2.0</span>
          <span>Subsystem Component Hierarchy &amp; Engineering Pillars</span>
        </h2>
        <div class="section-badges-group">
          <span class="section-badge badge-srs">SRS-M${tab.id}-COMPONENTS</span>
          <span class="section-badge badge-tech">DATA FLOW</span>
        </div>
      </div>
      <div class="section-body">
        <p>This module partitions platform functionality into four cohesive, decoupled engineering pillars to guarantee horizontal scalability and fault isolation:</p>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin:1.25rem 0;">
          ${tabData.components.map((c, i) => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:12px; padding:1.25rem;">
              <div style="font-weight:700; color:#ffffff; font-size:0.95rem; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
                <span style="background:rgba(99,102,241,0.2); color:#818cf8; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem;">${i+1}</span>
                ${c.title}
              </div>
              <p style="font-size:0.88rem; color:var(--text-secondary); margin:0; line-height:1.55;">${c.desc}</p>
            </div>
          `).join('')}
        </div>

        <div class="callout-box callout-tutorial">
          <div class="callout-title">
            <i class="ri-terminal-box-line"></i>
            Full-Stack Tutorial Objective
          </div>
          Mastering this subsystem enables developers to build resilient, decoupled architectures where presentation, business logic, and cloud persistence scale independently without single-point-of-failure bottlenecks.
        </div>
      </div>
    </article>

    <!-- SECTION 3: STEP-BY-STEP PRODUCTION IMPLEMENTATION GUIDE -->
    <article class="overview-section">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">3.0</span>
          <span>Step-by-Step Production Implementation Guide</span>
        </h2>
        <div class="section-badges-group">
          <span class="section-badge badge-srs">SRS-M${tab.id}-WORKFLOW</span>
          <span class="section-badge badge-tech">TUTORIAL</span>
        </div>
      </div>
      <div class="section-body">
        <p>Follow the practical full-stack development workflow to configure, implement, and deploy this subsystem:</p>
        
        <ol class="tutorial-steps">
          ${tabData.tutorialSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    </article>

    <!-- SECTION 4: SOURCE CODE BLUEPRINT & IMPLEMENTATION -->
    <article class="overview-section">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">4.0</span>
          <span>Production Implementation Source Code Blueprint</span>
        </h2>
        <div class="section-badges-group">
          <span class="section-badge badge-srs">SRS-M${tab.id}-CODE</span>
          <span class="section-badge badge-tech">PRODUCTION</span>
        </div>
      </div>
      <div class="section-body">
        <p>Examine the authentic production-grade implementation code operational within the DPGNotes tech stack:</p>
        
        <div class="code-block-wrap">
          <div class="code-header">
            <span><i class="ri-code-s-slash-line"></i> dpgnotes_module_${tab.id}_${tab.slug}.production.js</span>
            <button type="button" class="code-copy-btn" onclick="window.copyCodeSnippet(this)">
              <i class="ri-file-copy-line"></i> Copy Blueprint
            </button>
          </div>
          <pre class="code-block"><code>${escapeHtml(tabData.codeSnippet)}</code></pre>
        </div>
      </div>
    </article>

    <!-- SECTION 5: ARCHITECTURAL INVARIANTS & QUALITY STANDARDS -->
    <article class="overview-section">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">5.0</span>
          <span>Architectural Invariants &amp; Production Verification</span>
        </h2>
        <div class="section-badges-group">
          <span class="section-badge badge-srs">SRS-M${tab.id}-INVARIANTS</span>
          <span class="section-badge badge-tech">VERIFICATION</span>
        </div>
      </div>
      <div class="section-body">
        <p>Under official DRASA regulations and continuous cloud telemetry monitoring, this module enforces the following strict non-negotiable invariants:</p>
        
        <ul class="spec-bullets">
          ${tabData.invariants.map(inv => `<li><strong>Verified Invariant:</strong> ${inv}</li>`).join('')}
        </ul>

        <div class="callout-box callout-security">
          <div class="callout-title">
            <i class="ri-lock-line"></i>
            Security &amp; Tamper-Proofing Guarantee
          </div>
          Any deviation from these architectural invariants will trigger automated circuit breakers, log security incident events, and abort continuous deployment pipelines.
        </div>

        <!-- Collapsible Technical Accordion -->
        <details class="tech-spec-accordion">
          <summary class="tech-spec-summary">
            <span><i class="ri-terminal-box-line"></i> View Technical Schema, Benchmarks &amp; Endpoints</span>
            <i class="ri-arrow-down-s-line chevron"></i>
          </summary>
          <div class="tech-spec-content">
            <table class="overview-data-table">
              <thead>
                <tr>
                  <th>Technical Parameter</th>
                  <th>Production Target</th>
                  <th>Enforcement Mechanism</th>
                </tr>
              </thead>
              <tbody>
                ${tabData.specParameters.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.value}</td>
                    <td>${p.mechanism}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
              Direct Reference URL: <a href="https://dpgnotes.web.app/overview/index.html">https://dpgnotes.web.app/overview/index.html (Tab ${tab.id})</a>
            </div>
          </div>
        </details>
      </div>
    </article>

    <!-- NATIVE EDUCATIONAL SPONSOR SLOT -->
    ${generateNativeAdHtml(tab.id)}

    <!-- MODULE FOOTER NAVIGATION -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:3.5rem; padding-top:1.75rem; border-top:1px solid var(--border-subtle);">
      ${tab.id > 1 ? `
        <button type="button" class="header-nav-link" onclick="window.switchTab(${tab.id - 1})">
          <i class="ri-arrow-left-line"></i> Previous: Tab ${tab.id - 1}
        </button>
      ` : `<div></div>`}
      
      <a href="https://dpgnotes.web.app/dashboard.html" class="header-nav-link" style="background:rgba(99,102,241,0.15); color:#a5b4fc; border-color:rgba(99,102,241,0.35);">
        <i class="ri-dashboard-line"></i> Return to Contributor Dashboard
      </a>

      ${tab.id < 12 ? `
        <button type="button" class="header-nav-link" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#ffffff; border:none;" onclick="window.switchTab(${tab.id + 1})">
          Next: Tab ${tab.id + 1} <i class="ri-arrow-right-line"></i>
        </button>
      ` : `<div></div>`}
    </div>
  `;

  // Store in memory cache
  tabCache.set(tab.id, fullTabHtml);
  container.innerHTML = fullTabHtml;
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

// Generate Native Ad Matching PDF Viewer Format
function generateNativeAdHtml(slotIndex) {
  const adTitles = [
    "Akshat Network Hub • Next-Gen Cloud & Academic Infrastructure",
    "Horizon TechX • Premier Software Engineering Mentorship",
    "Codagenda • Elevate Your Tech Career with Real-World Systems",
    "DPGNotes Capstone Suite • Transform Your Computer Science Degree"
  ];
  const adDescs = [
    "Build state-of-the-art full-stack applications with verified mentorship and production-grade cloud deployments.",
    "Explore hands-on software development programs with industry engineers and accredited credentials.",
    "Accelerate your computer science mastery with curated system design blueprints, DSA guides, and mock interviews.",
    "Access certified study guides, past university exam papers, and high-DPI academic front cover generators."
  ];

  const title = adTitles[slotIndex % adTitles.length];
  const desc = adDescs[slotIndex % adDescs.length];

  return `
    <div class="overview-native-ad-slot">
      <div class="ad-sponsor-badge">
        <i class="ri-advertisement-fill"></i> Sponsored Educational Partner
      </div>
      <div class="ad-content-grid">
        <img src="https://dpgnotes.web.app/ANH.png" alt="Sponsor" class="ad-media-thumb">
        <div class="ad-details-box">
          <div class="ad-title">${title}</div>
          <div class="ad-desc">${desc}</div>
          <a href="https://akshat-881236.github.io/AkshatNetworkHub/" target="_blank" rel="noopener" class="ad-cta-btn">
            Learn More <i class="ri-arrow-right-up-line"></i>
          </a>
        </div>
      </div>
    </div>
  `;
}

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
// ACCESS CONTROL & CLEARANCE GATE CONTROLLER
// ============================================================================
async function checkAuthAndClearanceGate() {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  onAuthStateChanged(auth, async (user) => {
    const localUid = localStorage.getItem("dpgActiveUserUid");
    const localEmail = localStorage.getItem("dpgActiveUserEmail");
    const localName = localStorage.getItem("dpgActiveUserName");

    if (user) {
      currentActiveUser = user;
    } else if (localUid) {
      currentActiveUser = {
        uid: localUid,
        email: localEmail || "contributor@dpgnotes.app",
        displayName: localName || "Verified Contributor"
      };
    } else {
      currentActiveUser = null;
    }

    if (!currentActiveUser) {
      if (gateOverlay) gateOverlay.style.display = "flex";
      if (gateTitle) gateTitle.textContent = "Verified Contributor Sign In Required";
      if (gateDesc) gateDesc.textContent = "Access to the DPGNotes Full Stack Development Tutorial and Technical Architecture is strictly reserved for verified academic contributors with active administrator authorization.";
      if (gateStatusBox) {
        gateStatusBox.innerHTML = `
          <div style="color:#ef4444; font-weight:700; margin-bottom:4px;"><i class="ri-lock-line"></i> Authentication Required</div>
          Please sign in to your contributor account before requesting access clearance.
          <div style="margin-top:12px;">
            <a href="https://dpgnotes.web.app/dashboard.html" class="gate-btn-submit" style="text-decoration:none;">
              Sign In to Contributor Dashboard <i class="ri-arrow-right-line"></i>
            </a>
          </div>
        `;
      }
      if (gateForm) gateForm.style.display = "none";
      return;
    }

    // Authenticated: Query Firestore for clearance record
    try {
      let clearanceDoc = null;
      const docRef = doc(db, "confidential_overview_requests", currentActiveUser.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        clearanceDoc = { id: snap.id, ...snap.data() };
      } else {
        const q = query(collection(db, "confidential_overview_requests"), where("uid", "==", currentActiveUser.uid));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          clearanceDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
        }
      }

      currentClearanceRecord = clearanceDoc;

      if (!clearanceDoc) {
        renderRequestClearanceForm();
      } else if (clearanceDoc.status === "pending") {
        renderPendingStatus(clearanceDoc);
      } else if (clearanceDoc.status === "rejected") {
        renderRejectedStatus(clearanceDoc);
      } else if (clearanceDoc.status === "revoked") {
        renderRevokedStatus(clearanceDoc);
      } else if (clearanceDoc.status === "approved") {
        verifyDateThreshold(clearanceDoc);
      } else {
        renderRequestClearanceForm();
      }

    } catch(err) {
      console.error("Clearance check error:", err);
      renderRequestClearanceForm();
    }
  });
}

function verifyDateThreshold(record) {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  const now = new Date();
  const start = record.startDate ? new Date(record.startDate + "T00:00:00") : null;
  const end = record.endDate ? new Date(record.endDate + "T23:59:59") : null;

  if (start && now < start) {
    if (gateOverlay) gateOverlay.style.display = "flex";
    if (gateTitle) gateTitle.textContent = "Clearance Window Scheduled";
    if (gateDesc) gateDesc.textContent = "Your confidential viewing authorization has been granted by the Administrator, but the validity window has not started yet.";
    if (gateStatusBox) {
      gateStatusBox.innerHTML = `
        <div style="color:#38bdf8; font-weight:700;"><i class="ri-time-line"></i> Scheduled Access Window</div>
        <p style="margin:4px 0;"><strong>Active From:</strong> ${record.startDate}</p>
        <p style="margin:4px 0;"><strong>Expires On:</strong> ${record.endDate}</p>
        <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Please return on or after the scheduled start date.</p>
      `;
    }
    if (gateForm) gateForm.style.display = "none";
    return;
  }

  if (end && now > end) {
    if (gateOverlay) gateOverlay.style.display = "flex";
    if (gateTitle) gateTitle.textContent = "Clearance Window Expired";
    if (gateDesc) gateDesc.textContent = "Your previous overview access threshold has expired. Access has been automatically denied in accordance with DRASA security regulations.";
    if (gateStatusBox) {
      gateStatusBox.innerHTML = `
        <div style="color:#ef4444; font-weight:700;"><i class="ri-alarm-warning-line"></i> Access Expired</div>
        <p style="margin:4px 0;"><strong>Previous Expiry:</strong> ${record.endDate}</p>
        <p style="margin-top:6px; color:#cbd5e1;">A new clearance request with updated date threshold is required.</p>
      `;
    }
    renderRequestClearanceForm(true);
    return;
  }

  grantClearanceAccess(record);
}

function grantClearanceAccess(record) {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  if (gateOverlay) gateOverlay.style.display = "none";

  const userBadge = document.getElementById("headerClearanceBadge");
  if (userBadge) {
    userBadge.innerHTML = `<i class="ri-shield-check-fill" style="color:#10b981;"></i> <span class="clearance-text">Clearance Active (Thru ${record.endDate || 'Session'})</span>`;
  }

  window.switchTab(1);
}

function renderRequestClearanceForm(isRenewal = false) {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateOverlay) gateOverlay.style.display = "flex";
  if (gateTitle) gateTitle.textContent = isRenewal ? "Renew Confidential Clearance" : "Confidential Clearance Required";
  if (gateDesc) gateDesc.textContent = "Submit a formal request to the System Administrator. Once approved with an assigned date threshold, full access to all 12 documentation modules will unlock.";
  
  if (!isRenewal && gateStatusBox) {
    gateStatusBox.innerHTML = `
      <div style="color:#eab308; font-weight:700;"><i class="ri-information-line"></i> Contributor Clearance Gate</div>
      <p style="margin:4px 0; color:#cbd5e1;">Signed in as: <strong>${currentActiveUser.displayName || currentActiveUser.email}</strong></p>
      <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">Administrators review requests in the Admin Portal "Confidential" tab.</p>
    `;
  }

  if (gateForm) {
    gateForm.style.display = "block";
    gateForm.onsubmit = async (e) => {
      e.preventDefault();
      const reasonVal = document.getElementById("gateReasonInput")?.value || "";
      if (!reasonVal.trim()) {
        alert("Please provide your academic purpose for reviewing confidential architecture.");
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
      submitBtn.innerHTML = `Submit Clearance Request <i class="ri-arrow-right-line"></i>`;
    }
  }
}

function renderPendingStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateTitle) gateTitle.textContent = "Clearance Pending Approval";
  if (gateDesc) gateDesc.textContent = "Your request has been dispatched to the Administrator and is currently listed in the Admin Portal 'Confidential' Tab.";
  if (gateStatusBox) {
    gateStatusBox.innerHTML = `
      <div style="color:#eab308; font-weight:700;"><i class="ri-time-line"></i> Status: Pending Review</div>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Submitted By:</strong> ${record.displayName || record.email}</p>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Purpose:</strong> ${record.reason || 'Architecture evaluation'}</p>
      <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Once the Administrator authorizes your Start &amp; End dates, refresh this page to begin.</p>
      <button type="button" class="header-nav-link" style="margin-top:10px; width:100%; justify-content:center;" onclick="window.location.reload()">
        <i class="ri-refresh-line"></i> Check Status Now
      </button>
    `;
  }
  if (gateForm) gateForm.style.display = "none";
}

function renderRejectedStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  if (gateTitle) gateTitle.textContent = "Clearance Request Declined";
  if (gateDesc) gateDesc.textContent = "Your recent request for confidential system overview access was not approved by the moderation team.";
  if (gateStatusBox) {
    gateStatusBox.innerHTML = `
      <div style="color:#ef4444; font-weight:700;"><i class="ri-close-circle-line"></i> Request Declined</div>
      <p style="margin:4px 0; color:#cbd5e1;"><strong>Reason:</strong> ${record.rejectionReason || 'No justification provided'}</p>
      <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">You may submit a revised request addressing the requirements.</p>
    `;
  }
  renderRequestClearanceForm(true);
}

function renderRevokedStatus(record) {
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");

  if (gateTitle) gateTitle.textContent = "Clearance Revoked";
  if (gateDesc) gateDesc.textContent = "Your access credentials for the confidential system overview have been revoked by the Administrator.";
  if (gateStatusBox) {
    gateStatusBox.innerHTML = `
      <div style="color:#ef4444; font-weight:700;"><i class="ri-prohibited-line"></i> Access Revoked</div>
      <p style="margin:6px 0; color:#cbd5e1;">Contact administrator support if you believe this action was made in error.</p>
    `;
  }
  renderRequestClearanceForm(true);
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
