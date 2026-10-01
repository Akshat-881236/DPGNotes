/**
 * DPGNotes Project-Based FSD Tutorial, SRS Overview & Technical Blueprint
 * Script: script.js (Legal Center Architecture v2.0.0 - Comprehensive Module Registry)
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
// 12 MODULE SPECIFICATIONS & GROUPED STRUCTURE (LEGAL CENTER TAXONOMY)
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
        desc: "Master Full Stack 3-tier system design: Edge CDN routing, client-server topology, serverless triggers, and high-availability SRS requirements.",
        sections: [
          { id: "arch-1", num: "1.1", title: "Enterprise System Overview & Core Mission", badge: "Core SRS" },
          { id: "arch-2", num: "1.2", title: "Edge Network & Global Distribution Model", badge: "CDN" },
          { id: "arch-3", num: "1.3", title: "Stateless Microservices & Node.js Cluster", badge: "Backend" },
          { id: "arch-4", num: "1.4", title: "Cloud Firestore Real-Time NoSQL Backbone", badge: "Database" },
          { id: "arch-5", num: "1.5", title: "Cross-Origin Security & CORS Middleware", badge: "Security" },
          { id: "arch-6", num: "1.6", title: "Dynamic Routing & SPA Navigation Engine", badge: "Frontend" },
          { id: "arch-7", num: "1.7", title: "Multi-Tier Caching & Asset Compression", badge: "Performance" },
          { id: "arch-8", num: "1.8", title: "Automated Error Handling & Fault Tolerance", badge: "Resilience" },
          { id: "arch-9", num: "1.9", title: "Telemetry Ingestion & Asynchronous Pipeline", badge: "Telemetry" },
          { id: "arch-10", num: "1.10", title: "DNS Infrastructure, TLS 1.3 & HSTS Enforcements", badge: "Protocol" },
          { id: "arch-11", num: "1.11", title: "Serverless Micro-Daemons & Lifecycle Triggers", badge: "Serverless" },
          { id: "arch-12", num: "1.12", title: "High-Availability Disaster Recovery Roadmap", badge: "DevOps" }
        ]
      },
      {
        id: 2,
        slug: "frontend",
        title: "Frontend Engineering & UI Component Hierarchy",
        icon: "ri-layout-masonry-line",
        readTime: "14 min read",
        desc: "In-depth Vanilla JS component architecture, CSS custom properties, responsive breakpoints, foldable device support, and progressive hydration.",
        sections: [
          { id: "fe-1", num: "2.1", title: "Design System & CSS Custom Properties", badge: "Design" },
          { id: "fe-2", num: "2.2", title: "Foldable & Dual-Screen Layout Adaptations", badge: "Responsive" },
          { id: "fe-3", num: "2.3", title: "Glassmorphism & Surface Elevation Hierarchy", badge: "Styling" },
          { id: "fe-4", num: "2.4", title: "Single Page Application (SPA) State Containers", badge: "State" },
          { id: "fe-5", num: "2.5", title: "DOM Lifecycle & Memory Management", badge: "Performance" },
          { id: "fe-6", num: "2.6", title: "Custom Modal & Dialog Component Framework", badge: "Components" },
          { id: "fe-7", num: "2.7", title: "Search Input Debouncing & Autocomplete", badge: "Search UX" },
          { id: "fe-8", num: "2.8", title: "PDF.js Canvas & Dynamic In-Memory Watermarking", badge: "PDF Engine" },
          { id: "fe-9", num: "2.9", title: "Theme Switching Engine: Dark, Light & Auto", badge: "Themes" },
          { id: "fe-10", num: "2.10", title: "PWA Service Worker & Offline Asset Caching", badge: "PWA" },
          { id: "fe-11", num: "2.11", title: "Web Accessibility (A11y) & ARIA Landmarks", badge: "A11y" },
          { id: "fe-12", num: "2.12", title: "Mobile Touch Gestures & Inertial Scrolling", badge: "Mobile" }
        ]
      },
      {
        id: 3,
        slug: "backend-api",
        title: "Express Backend, Server API Endpoints & Microservices",
        icon: "ri-server-line",
        readTime: "15 min read",
        desc: "Exhaustive documentation of Node.js / Express backend service on Render, REST endpoints, JWT verification, and telemetry dispatchers.",
        sections: [
          { id: "api-1", num: "3.1", title: "Express Server Bootstrap & Middleware Pipeline", badge: "Core API" },
          { id: "api-2", num: "3.2", title: "Authentication Endpoints & Session Tokens", badge: "Auth" },
          { id: "api-3", num: "3.3", title: "Document Management & Metadata Upload API", badge: "CRUD" },
          { id: "api-4", num: "3.4", title: "AI Intelligence Query & Proxy Gateway", badge: "AI Gateway" },
          { id: "api-5", num: "3.5", title: "Sponsored Ads Submissions & Review Workflow", badge: "Ads API" },
          { id: "api-6", num: "3.6", title: "Telemetry Tracking: Views, Clicks & Screentime", badge: "Analytics" },
          { id: "api-7", num: "3.7", title: "Administrative Command Center Protected Routes", badge: "RBAC" },
          { id: "api-8", num: "3.8", title: "Brevo SMTP Mail Service & Notification Rules", badge: "Mail" },
          { id: "api-9", num: "3.9", title: "Social Networking, Connection & Chat Endpoints", badge: "Social" },
          { id: "api-10", num: "3.10", title: "Rate Limiting & Denial-of-Service Defense", badge: "Security" },
          { id: "api-11", num: "3.11", title: "Python Bridge: Child Process Data Processing", badge: "Python" },
          { id: "api-12", num: "3.12", title: "Health Checks, Heartbeat & Uptime Monitoring", badge: "DevOps" }
        ]
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
        desc: "Automated media transformation pipelines, dynamic cover page rendering, signed uploads, and low-bandwidth asset optimization.",
        sections: [
          { id: "cld-1", num: "4.1", title: "Cloudinary SDK Setup & Signed Upload Strategy", badge: "Cloud Media" },
          { id: "cld-2", num: "4.2", title: "Automated Thumbnail Downscaling & Cropping", badge: "Transform" },
          { id: "cld-3", num: "4.3", title: "PDF Document Parsing & Page Counting", badge: "PDF Engine" },
          { id: "cld-4", num: "4.4", title: "Dynamic Cover Page Generator & Watermarking", badge: "DRM" },
          { id: "cld-5", num: "4.5", title: "Low-Bandwidth Adaptive Delivery (f_auto, q_auto)", badge: "Bandwidth" },
          { id: "cld-6", num: "4.6", title: "Secure PDF Download Routing & Tokenized Access", badge: "Tokens" },
          { id: "cld-7", num: "4.7", title: "Multi-Part Uploads & Chunked Transfer Resumption", badge: "Uploads" },
          { id: "cld-8", num: "4.8", title: "Cloudinary Webhook Callbacks & Verification", badge: "Webhooks" },
          { id: "cld-9", num: "4.9", title: "Asset Lifecycle Management & Garbage Collection", badge: "Cleanup" },
          { id: "cld-10", num: "4.10", title: "Content Security Policy (CSP) & Media Delivery", badge: "CSP" },
          { id: "cld-11", num: "4.11", title: "Cross-Device Media Testing & Fallback Caching", badge: "Testing" }
        ]
      },
      {
        id: 5,
        slug: "database-schema",
        title: "Cloud Firestore Real-Time Database & Data Modeling",
        icon: "ri-database-line",
        readTime: "14 min read",
        desc: "Complete NoSQL schema design, collections and subcollections, denormalization, Firestore security rules, and atomic transactions.",
        sections: [
          { id: "db-1", num: "5.1", title: "NoSQL Schema Architecture: Collections & Documents", badge: "NoSQL" },
          { id: "db-2", num: "5.2", title: "Denormalization Strategies for High-Velocity Reads", badge: "Data Modeling" },
          { id: "db-3", num: "5.3", title: "Granular Firestore Security Rules & Access Lists", badge: "Rules" },
          { id: "db-4", num: "5.4", title: "Atomic Transactions & Multi-Document Batch Writes", badge: "Transactions" },
          { id: "db-5", num: "5.5", title: "Compound Index Optimization & Query Execution", badge: "Indexes" },
          { id: "db-6", num: "5.6", title: "Real-Time Document Listeners (onSnapshot) & Sync", badge: "Real-Time" },
          { id: "db-7", num: "5.7", title: "Database Schema Versioning & Backfills", badge: "Migrations" },
          { id: "db-8", num: "5.8", title: "Ephemeral Analytics TTL & Automated Pruning", badge: "TTL" },
          { id: "db-9", num: "5.9", title: "Backup Strategies, Offline Persistence & Caching", badge: "Backups" },
          { id: "db-10", num: "5.10", title: "Audit Logging & Immutable Compliance Ledger", badge: "Auditing" },
          { id: "db-11", num: "5.11", title: "Firestore Latency Benchmarks & Quota Controls", badge: "Benchmarks" }
        ]
      },
      {
        id: 6,
        slug: "security-vault",
        title: "Cryptographic Vault & AES-256-GCM Security Engine",
        icon: "ri-shield-keyhole-line",
        readTime: "15 min read",
        desc: "Proprietary code obfuscation, authenticated AES-256-GCM encryption, in-memory sandboxed V8 execution, and PBKDF2 key derivation.",
        sections: [
          { id: "sec-1", num: "6.1", title: "Zero-Knowledge Code Protection & In-Memory Execution", badge: "Crypto" },
          { id: "sec-2", num: "6.2", title: "AES-256-GCM Authenticated Encryption & Tamper Defense", badge: "GCM" },
          { id: "sec-3", num: "6.3", title: "PBKDF2 Key Derivation Function & Salt Generation", badge: "KDF" },
          { id: "sec-4", num: "6.4", title: "Node.js V8 VM Sandboxed Script Compilation", badge: "V8 VM" },
          { id: "sec-5", num: "6.5", title: "HMAC-SHA256 Integrity Verification Circuit Breaker", badge: "HMAC" },
          { id: "sec-6", num: "6.6", title: "Multi-Stage Vault Build Pipeline (vault.js CLI)", badge: "CLI Tool" },
          { id: "sec-7", num: "6.7", title: "Server Startup Verification & Test Suite Runner", badge: "Test Suite" },
          { id: "sec-8", num: "6.8", title: "Memory Scrubbing & Defense Against Heap Dumps", badge: "Defense" },
          { id: "sec-9", num: "6.9", title: "Secret Store Decoupling & Environment Isolation", badge: "Secrets" },
          { id: "sec-10", num: "6.10", title: "Audit Trail Logging for Cryptographic Events", badge: "Audit" },
          { id: "sec-11", num: "6.11", title: "Recovery Protocols During Key Rotation Incidents", badge: "Recovery" }
        ]
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
        desc: "Tiered multi-model architecture: Google Gemini 1.5/2.0 Pro/Flash priority cascade with automatic fallback to xAI Grok.",
        sections: [
          { id: "ai-1", num: "7.1", title: "Multi-LLM Provider Architecture: Gemini & Grok", badge: "Multi-LLM" },
          { id: "ai-2", num: "7.2", title: "Tiered Fallback Cascade: Gemini Pro -> Flash -> Grok", badge: "Fallback" },
          { id: "ai-3", num: "7.3", title: "Context-Aware Academic Prompt Engineering", badge: "Prompts" },
          { id: "ai-4", num: "7.4", title: "Legal Center AI Advisor: Regulatory Citations", badge: "Legal AI" },
          { id: "ai-5", num: "7.5", title: "PDF Document Summarization & Chunking Engine", badge: "Doc AI" },
          { id: "ai-6", num: "7.6", title: "Assignment & Practical Solution Generation", badge: "Solutions" },
          { id: "ai-7", num: "7.7", title: "Admin Intelligence: Automated Anomaly Scans", badge: "Moderation" },
          { id: "ai-8", num: "7.8", title: "Token Optimization, Truncation & Cost Controls", badge: "Optimization" },
          { id: "ai-9", num: "7.9", title: "Streaming Responses (Server-Sent Events) & UI", badge: "Streaming" },
          { id: "ai-10", num: "7.10", title: "Markdown Sanitization (DOMPurify + Marked)", badge: "Security" },
          { id: "ai-11", num: "7.11", title: "Quality Assurance Benchmarks & Hallucination Defense", badge: "QA" }
        ]
      },
      {
        id: 8,
        slug: "search-engine",
        title: "High-Performance Search & SERP Ranking Algorithms",
        icon: "ri-search-eye-line",
        readTime: "12 min read",
        desc: "Lexical & semantic search engine, tokenization, multi-field weighted scoring, CTR feedback loops, and sub-50ms query benchmarks.",
        sections: [
          { id: "se-1", num: "8.1", title: "Search Architecture & Query Ingestion Pipeline", badge: "Search" },
          { id: "se-2", num: "8.2", title: "Tokenization, Stemming & Academic NLP Synonyms", badge: "NLP" },
          { id: "se-3", num: "8.3", title: "Multi-Field Weighted Relevance Ranking Formula", badge: "Ranking" },
          { id: "se-4", num: "8.4", title: "Click-Through-Rate (CTR) Feedback Telemetry Loop", badge: "Telemetry" },
          { id: "se-5", num: "8.5", title: "Instant Auto-Suggestions & Memory Trie Cache", badge: "Trie UX" },
          { id: "se-6", num: "8.6", title: "SERP Tabbed Navigation: Notes, AI, Solutions", badge: "SERP" },
          { id: "se-7", num: "8.7", title: "Filter Matrix: Disciplines, Years & Semesters", badge: "Filters" },
          { id: "se-8", num: "8.8", title: "Zero-Result Intelligence & Fuzzy Alternatives", badge: "Fuzzy" },
          { id: "se-9", num: "8.9", title: "Search Bot Crawling, Sitemap.xml & Google SEO", badge: "SEO" },
          { id: "se-10", num: "8.10", title: "Sub-50ms Query Optimization & Memory Benchmarks", badge: "Speed" },
          { id: "se-11", num: "8.11", title: "Mobile & Foldable SERP Responsiveness", badge: "Mobile SERP" }
        ]
      },
      {
        id: 9,
        slug: "video-ecosystem",
        title: "Educational Media Studio & Video Ecosystem",
        icon: "ri-video-line",
        readTime: "11 min read",
        desc: "Dual HTML5/YouTube player engine, academic vs sponsored switching, double-write persistence pattern, and share tokens.",
        sections: [
          { id: "vid-1", num: "9.1", title: "Dual Video Player Engine: HTML5 & YouTube API", badge: "Player" },
          { id: "vid-2", num: "9.2", title: "Predefined Academic Video Library & Curation", badge: "Academic" },
          { id: "vid-3", num: "9.3", title: "Sponsored Video Ad Campaigns & Insertion Rules", badge: "Ads" },
          { id: "vid-4", num: "9.4", title: "Dynamic Pool Switching: Academic vs Sponsored Ads", badge: "Pools" },
          { id: "vid-5", num: "9.5", title: "Full-Screen Immersive Theater Mode & Orientation", badge: "Display" },
          { id: "vid-6", num: "9.6", title: "Social Interactions: Contributor Likes & View Sync", badge: "Social" },
          { id: "vid-7", num: "9.7", title: "Native Web Share API with Ephemeral VSH_ Tokens", badge: "Tokens" },
          { id: "vid-8", num: "9.8", title: "Double-Write Persistence: Client & Backend Sync", badge: "Sync" },
          { id: "vid-9", num: "9.9", title: "Case-Sensitivity Normalization for YouTube IDs", badge: "Normalizer" },
          { id: "vid-10", num: "9.10", title: "Moderation Queue & Contributor Video Approvals", badge: "Moderation" },
          { id: "vid-11", num: "9.11", title: "Video Telemetry & Screentime Retention Auditing", badge: "Analytics" }
        ]
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
        desc: "User identity hierarchy, auth parity (Password & Google OAuth), clearance levels, reputation scoring, and the Admin Confidential Tab.",
        sections: [
          { id: "user-1", num: "10.1", title: "Identity Tiers: Guest, Contributor & Admin", badge: "Identity" },
          { id: "user-2", num: "10.2", title: "Auth Parity: Password Login vs OAuth Providers", badge: "Auth Parity" },
          { id: "user-3", num: "10.3", title: "Contributor Onboarding & Verification Protocol", badge: "Verification" },
          { id: "user-4", num: "10.4", title: "Reputation Scoring Algorithm & Milestone Badges", badge: "Reputation" },
          { id: "user-5", num: "10.5", title: "Contributor Dashboard Metrics & Real-Time Sync", badge: "Dashboard" },
          { id: "user-6", num: "10.6", title: "Peer Networking, Follower Subscriptions & Chat", badge: "Social" },
          { id: "user-7", num: "10.7", title: "Upload Quotas, MIME Validation & DRASA Review", badge: "Quotas" },
          { id: "user-8", num: "10.8", title: "GDPR Compliance & Account Deletion Protocols", badge: "GDPR" },
          { id: "user-9", num: "10.9", title: "Admin Confidential Tab: Pending, Active & History", badge: "Admin Portal" },
          { id: "user-10", num: "10.10", title: "Date-Threshold Approvals & Automated Revocation", badge: "Access Gate" },
          { id: "user-11", num: "10.11", title: "Contributor Code of Conduct & Honor Regulations", badge: "Ethics" }
        ]
      },
      {
        id: 11,
        slug: "legal-compliance",
        title: "Legal Center, DMCA, Privacy & Compliance Policies",
        icon: "ri-scales-3-line",
        readTime: "14 min read",
        desc: "Official legal governance: DMCA notice-and-takedown workflow, DRASA framework, automated 14-day ephemeral data cleansing, and privacy.",
        sections: [
          { id: "leg-1", num: "11.1", title: "Legal Center Architecture & Policy Navigation", badge: "Legal Hub" },
          { id: "leg-2", num: "11.2", title: "Terms of Service & Academic Open-Access Agreement", badge: "Terms" },
          { id: "leg-3", num: "11.3", title: "Privacy Policy, PII Minimization & Security Commitments", badge: "Privacy" },
          { id: "leg-4", num: "11.4", title: "DMCA Notice-and-Takedown Compliance Procedure", badge: "DMCA" },
          { id: "leg-5", num: "11.5", title: "Copyright Ownership & Attribution Standards", badge: "Copyright" },
          { id: "leg-6", num: "11.6", title: "Automated 14-Day Ephemeral Data Retention Purge", badge: "Retention" },
          { id: "leg-7", num: "11.7", title: "Cookie Consent & LocalStorage Governance Rules", badge: "Cookies" },
          { id: "leg-8", num: "11.8", title: "Advertising Standards & Commercial Disclosures", badge: "Advertising" },
          { id: "leg-9", num: "11.9", title: "External Links Disclaimers & Perimeter Security", badge: "Disclaimers" },
          { id: "leg-10", num: "11.10", title: "DRASA Framework: Institutional Academic Integrity", badge: "DRASA" },
          { id: "leg-11", num: "11.11", title: "Compliance Auditing & Exportable PDF Reports", badge: "Auditing" }
        ]
      },
      {
        id: 12,
        slug: "devops-cicd",
        title: "DevOps, Cloud Deployment & CI/CD Telemetry",
        icon: "ri-git-branch-line",
        readTime: "12 min read",
        desc: "Multi-cloud architecture (Firebase Hosting + Render Node.js), GitHub Actions CI/CD automation, secrets vault lifecycle, and monitoring.",
        sections: [
          { id: "ops-1", num: "12.1", title: "Multi-Cloud Hybrid Architecture: Firebase & Render", badge: "Hybrid Cloud" },
          { id: "ops-2", num: "12.2", title: "GitHub Actions CI/CD Pipeline & Automated Deployments", badge: "CI/CD" },
          { id: "ops-3", num: "12.3", title: "Vault Secret Management in Production & CI", badge: "Secrets" },
          { id: "ops-4", num: "12.4", title: "Firebase CLI Hosting & Edge Cache Invalidation", badge: "Hosting" },
          { id: "ops-5", num: "12.5", title: "Render Service Monitoring, Latency & Error Budgets", badge: "Monitoring" },
          { id: "ops-6", num: "12.6", title: "Disaster Recovery (DR) Plan & Standby Strategy", badge: "Disaster Recovery" },
          { id: "ops-7", num: "12.7", title: "Semantic Versioning (SemVer) & Release Rollbacks", badge: "Versioning" },
          { id: "ops-8", num: "12.8", title: "Load Testing & 10,000+ Concurrent Reader Benchmarks", badge: "Stress Testing" },
          { id: "ops-9", num: "12.9", title: "Security Vulnerability Auditing (npm audit, Snyk)", badge: "Auditing" },
          { id: "ops-10", num: "12.10", title: "Cross-Device Verification & Lighthouse Optimization", badge: "Quality" },
          { id: "ops-11", num: "12.11", title: "Production Launch Readiness & Capstone Sign-Off", badge: "SRS Sign-Off" },
          { id: "ops-12", num: "12.12", title: "Operational Playbooks & Incident Escalation Hierarchy", badge: "SRE" }
        ]
      }
    ]
  }
];

// Flatten all modules for easy lookup
export const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

// ============================================================================
// COMPREHENSIVE FSD TUTORIAL & SRS REGISTRY (ALL 12 MODULES)
// ============================================================================
const FSD_TUTORIAL_REGISTRY = {
  1: {
    overview: "This foundational module introduces the full-stack system architecture of DPGNotes. Learn how client-side Single Page Applications (SPA), global edge content distribution, stateless microservices, and real-time distributed NoSQL databases collaborate to deliver zero-latency academic knowledge retrieval.",
    techStack: ["Node.js", "Express.js", "Firebase Hosting", "Cloud Firestore", "Render Cloud", "Fastly CDN", "TLS 1.3"],
    keyDeliverables: [
      "Architect a 3-tier hybrid cloud system decoupling presentation, compute, and data layers.",
      "Configure edge CDN reverse proxy routing with immutable caching headers.",
      "Enforce stateless microservice scalability with zero-downtime rolling updates."
    ],
    stepsIntro: "In this practical Full Stack Development milestone, we implement a production 3-tier architecture with Firebase Hosting, an Express microservice on Render, and Cloud Firestore."
  },
  2: {
    overview: "Explore the modern Frontend Engineering paradigm of DPGNotes. Built in high-performance Vanilla JavaScript and modern CSS without the overhead of heavy virtual DOM frameworks, this module demonstrates responsive grid design, custom modal frameworks, PDF canvas rendering, and progressive web application (PWA) caching.",
    techStack: ["Vanilla JavaScript (ES6+)", "CSS Custom Properties", "PDF.js Engine", "Service Workers (PWA)", "Web Canvas API"],
    keyDeliverables: [
      "Construct a zero-framework component architecture with modular lifecycle management.",
      "Implement fluid responsive layouts supporting 280px foldables up to 4K displays.",
      "Deploy custom accessible modal framework replacing all native blocking dialogs."
    ],
    stepsIntro: "In this practical UI/UX engineering tutorial, we build fluid responsive interfaces that seamlessly adapt from 280px foldable devices up to 4K ultra-wide monitors."
  },
  3: {
    overview: "Master modern Backend API engineering with Node.js and Express. This module covers REST microservices, token validation, document ingestion, Cloudinary signed upload handlers, and Brevo SMTP mail dispatching.",
    techStack: ["Node.js", "Express.js", "Firebase Admin SDK", "JWT Authentication", "Brevo SMTP", "express-rate-limit"],
    keyDeliverables: [
      "Build RESTful microservices following strict 12-factor cloud principles.",
      "Implement dual token validation with Firebase Admin SDK and signed session cookies.",
      "Deploy automated keep-alive probes to eliminate cold starts on Render."
    ],
    stepsIntro: "Build a production RESTful microservice layer following 12-factor app principles and defense-in-depth security."
  },
  4: {
    overview: "Study DPGNotes' media transformation and asset delivery pipelines. Learn how user-uploaded PDF study notes are parsed, converted into high-DPI canvas front covers, watermarked with contributor attribution, and served through Cloudinary's global media CDN with on-the-fly bandwidth optimization.",
    techStack: ["Cloudinary Node.js SDK", "PDF-Lib", "Canvas 2D API", "Brotli Compression", "Signed Direct Uploads"],
    keyDeliverables: [
      "Automate serverless thumbnail generation and high-DPI cover page synthesis.",
      "Embed dynamic DRM watermarks onto academic PDF documents in-memory.",
      "Optimize bandwidth consumption via Cloudinary adaptive formats (f_auto, q_auto)."
    ],
    stepsIntro: "Construct an automated media transformation pipeline with signed client uploads and dynamic PDF watermarking."
  },
  5: {
    overview: "Explore the database modeling strategies powering DPGNotes. Learn how Cloud Firestore's distributed NoSQL collections are structured for high-velocity read workloads, compound indexing, real-time reactive sync (onSnapshot), and atomic transactions.",
    techStack: ["Google Cloud Firestore", "NoSQL Data Modeling", "Security Rules Engine", "Compound Indexing", "ACID Transactions"],
    keyDeliverables: [
      "Architect high-throughput NoSQL schemas balancing normalization with read speeds.",
      "Deploy atomic transaction counters to eliminate concurrency race conditions.",
      "Automate 14-day ephemeral data cleansing using Firestore TTL mechanisms."
    ],
    stepsIntro: "Design and implement production NoSQL collections with granular security rules and real-time reactive observers."
  },
  6: {
    overview: "Study DPGNotes' proprietary security architecture: the Cryptographic Vault. This module covers AES-256-GCM authenticated encryption, PBKDF2 key derivation, in-memory sandboxed V8 execution, and zero-knowledge deployments.",
    techStack: ["Node.js crypto Module", "AES-256-GCM", "PBKDF2 Key Derivation", "V8 VM Sandboxed Execution", "HMAC-SHA256"],
    keyDeliverables: [
      "Compile proprietary server source into authenticated AES-256-GCM ciphertexts.",
      "Execute decrypted bytecode directly in memory without disk footprint.",
      "Deploy hardware-accelerated tamper detection circuit breakers."
    ],
    stepsIntro: "In this advanced security engineering milestone, we explore how server source code is compiled into an encrypted payload (server.payload.enc) and executed entirely in RAM without touching disk."
  },
  7: {
    overview: "Explore DPGNotes' multi-engine Artificial Intelligence pipeline. Learn how Google Gemini 1.5/2.0 Pro and Flash models are orchestrated with a seamless fallback to xAI Grok, delivering resilient legal advisory, PDF document summarization, and solution generation.",
    techStack: ["Google Gemini 2.0 / 1.5 Pro & Flash", "xAI Grok API", "Server-Sent Events (SSE)", "DOMPurify", "Marked.js"],
    keyDeliverables: [
      "Orchestrate resilient multi-LLM fallback pipelines (Gemini Pro -> Flash -> Grok).",
      "Engineer context-aware system prompts enforcing academic integrity boundaries.",
      "Stream sanitized Markdown responses via Server-Sent Events with zero XSS risk."
    ],
    stepsIntro: "Implement a tiered AI proxy gateway with automated health scoring, token usage limits, and streaming Markdown responses."
  },
  8: {
    overview: "Master the algorithms powering DPGNotes' search engine and SERP ranking. Discover how client-side trie autocomplete, server-side lexical tokenization, multi-field weighted scoring formulas, and CTR telemetry feedback loops deliver sub-50ms search results.",
    techStack: ["Lexical Tokenizer", "Inverted Index Trie", "TF-IDF Scoring Formula", "OpenGraph Protocol", "Debounced Autocomplete"],
    keyDeliverables: [
      "Develop client-side debounced search suggestion trie with sub-10ms latency.",
      "Implement multi-field weighted relevance scoring boosted by user CTR feedback.",
      "Architect faceted SERP navigation across disciplines, semesters, and document types."
    ],
    stepsIntro: "Build an academic search engine with inverted indexing, weighted multi-field relevance, and real-time autocomplete."
  },
  9: {
    overview: "Deep dive into the Educational Media Studio and Video Ecosystem. This module breaks down the dual HTML5/YouTube player architecture, fullscreen theater mode, real-time social engagement, and resilient double-write share link persistence.",
    techStack: ["YouTube IFrame API", "HTML5 Media Player", "Firestore Real-Time Sync", "Web Share API", "Double-Write Pattern"],
    keyDeliverables: [
      "Integrate dual HTML5/YouTube playback engine with full-screen theater mode.",
      "Interleave curated syllabus lectures with sponsored educational university ads.",
      "Guarantee share link persistence via simultaneous client setDoc and backend dispatch."
    ],
    stepsIntro: "Build an academic video streaming interface with YouTube API integration and guaranteed Firestore share persistence."
  },
  10: {
    overview: "Explore the Contributor Ecosystem and Role-Based Access Control (RBAC). Understand how DPGNotes ensures feature parity between traditional email/password and OAuth sign-in methods, manages reputation milestones, and provides administrative access gates in the Admin Confidential Tab.",
    techStack: ["Firebase Authentication", "Google OAuth 2.0", "Firestore RBAC Rules", "Reputation Scoring Engine", "Admin Command Center"],
    keyDeliverables: [
      "Enforce authentication parity between traditional email/password and OAuth providers.",
      "Implement Contributor verification workflows with automated reputation milestone badges.",
      "Build Admin Confidential Tab CRUD with date-threshold access gates and automatic expiry."
    ],
    stepsIntro: "Implement an enterprise RBAC hierarchy with credential parity, automated reputation badges, and date-threshold approvals."
  },
  11: {
    overview: "Study the legal engineering frameworks governing DPGNotes. Discover how the platform complies with DMCA notice-and-takedown procedures, enforces DRASA academic integrity standards, automates 14-day ephemeral data cleansing, and maintains transparent advertising policies.",
    techStack: ["DRASA Compliance Framework", "DMCA Takedown Engine", "Cookie Consent Governance", "GDPR Data Deletion", "Legal Policy Engine"],
    keyDeliverables: [
      "Construct automated DMCA notice-and-takedown workflow with attribution tracking.",
      "Deploy automated 14-day ephemeral data cleansing for privacy compliance.",
      "Embed DRASA academic integrity standards across all contributed study materials."
    ],
    stepsIntro: "Integrate regulatory compliance mechanisms, automated intellectual property safeguards, and privacy retention rules."
  },
  12: {
    overview: "Master modern cloud DevOps and site reliability engineering. This module covers multi-cloud hybrid deployments (Firebase Hosting + Render Node.js), GitHub Actions CI/CD automation, production secrets lifecycle, and 10,000+ reader concurrency benchmarking.",
    techStack: ["GitHub Actions", "Firebase CLI", "Render Deploy Hooks", "Vault Encryption CLI", "Snyk Vulnerability Auditing"],
    keyDeliverables: [
      "Automate multi-cloud deployment pipelines for static hosting and backend microservices.",
      "Integrate cryptographic vault verification into CI test suites before deployment.",
      "Conduct 10,000+ reader concurrency benchmarking and zero-downtime disaster recovery drills."
    ],
    stepsIntro: "Deploy automated continuous integration and continuous deployment (CI/CD) workflows with multi-cloud health telemetry."
  }
};

// ============================================================================
// DOMAIN-AWARE SUB-CHAPTER CONTENT GENERATOR
// ============================================================================
function generateSubChapterContent(tab, sec) {
  const customTab = FSD_TUTORIAL_REGISTRY[tab.id];
  
  // High-yield domain templates
  const domainTemplates = {
    // 1. Architecture
    1: {
      conceptPrefix: "Within the DPGNotes architecture, this layer orchestrates the seamless flow of academic resources across edge PoPs and core microservices.",
      stepTemplate: (t) => [
        `Analyze the Software Requirements Specification (SRS) for ${t} to define interface contracts and latency budgets.`,
        `Configure client-side request dispatchers to target edge proxy endpoints (/api/...) with automatic retry logic.`,
        `Bind upstream routes to Render microservices with circuit breakers to prevent cascading service degradation.`,
        `Verify cross-region telemetry capture to ensure auditability under DRASA governance standards.`
      ],
      codeSnippet: (s) => `// Architectural Subsystem: ${s.id}
export async function setup_${s.id.replace(/-/g, '_')}() {
  const nodeConfig = {
    subsystem: "${s.title}",
    edgeRouting: "https://dpgnotes.web.app/api/${s.id}",
    failoverRegion: "eu-west-1",
    healthCheckIntervalMs: 30000,
    circuitBreakerThreshold: 5
  };
  return Object.freeze(nodeConfig);
}`,
      invariants: [
        "Edge reverse proxy latency must remain below 15ms under standard network conditions.",
        "Zero unauthenticated bypass of API gateways; all state-mutating calls require validated tokens.",
        "System telemetry logs must be dispatched asynchronously without impeding user response times."
      ]
    },
    // 2. Frontend
    2: {
      conceptPrefix: "The DPGNotes client-side interface emphasizes instantaneous rendering, zero-framework lightweight execution, and complete cross-device responsiveness.",
      stepTemplate: (t) => [
        `Declare semantic CSS custom properties in :root for consistent typography, spacing, and color contrast.`,
        `Construct modular JavaScript components with lifecycle hooks (mount, render, destroy) without external framework bloat.`,
        `Attach debounced resize and orientation listeners to adapt layouts across mobile, foldable, and tablet screens.`,
        `Ensure keyboard navigation, ARIA live regions, and screen reader landmarks comply with WCAG 2.1 AA standards.`
      ],
      codeSnippet: (s) => `// Frontend Component Controller: ${s.id}
class ${s.id.replace(/[-_]/g, '')}Controller {
  constructor(container) {
    this.container = container;
    this.state = { active: true, deviceTier: window.innerWidth < 768 ? 'mobile' : 'desktop' };
  }
  render() {
    this.container.classList.add('hydrated-component');
    this.bindEvents();
  }
  bindEvents() {
    window.addEventListener('resize', () => this.handleResize(), { passive: true });
  }
}`,
      invariants: [
        "Zero horizontal page-level overflow across all viewports from 280px foldables to 4K monitors.",
        "Component hydration must complete within 50ms of DOMContentLoaded.",
        "All user modals and alerts must utilize custom async dialogs without native blocking dialogs."
      ]
    },
    // 3. Backend API
    3: {
      conceptPrefix: "Operating on Render's containerized infrastructure, the Express microservice processes authentication, document uploads, and external AI queries.",
      stepTemplate: (t) => [
        `Define Express route middleware verifying Firebase Admin ID tokens and extracting user claims.`,
        `Implement JSON schema payload validation using Joi / express-validator before invoking database drivers.`,
        `Dispatch asynchronous transactional emails via Brevo SMTP with anti-spam rate limiting.`,
        `Attach structured Winston loggers recording route duration, status codes, and client IP addresses.`
      ],
      codeSnippet: (s) => `// Express REST Route: ${s.id}
app.post('/api/${s.id}', async (req, res) => {
  try {
    const { payload, token } = req.body;
    const decoded = await admin.auth().verifyIdToken(token);
    // Process verified request under req.user
    res.status(200).json({ success: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
});`,
      invariants: [
        "All mutating endpoints must enforce strict express-rate-limit quotas (max 100 req/15min).",
        "Payloads exceeding 10MB are rejected at edge middleware before buffer allocation.",
        "Zero plaintext database credentials in source code; all secrets are sourced from environment variables."
      ]
    },
    // 4. Cloudinary Media
    4: {
      conceptPrefix: "The Cloudinary media pipeline handles the high-volume ingestion and dynamic transformation of university syllabus materials, past question papers, and solutions.",
      stepTemplate: (t) => [
        `Generate secure, time-limited cryptographic upload signatures on the Node.js backend using cloudinary.utils.api_sign_request.`,
        `Upload raw document files directly from the client to Cloudinary bypassing server bandwidth limits.`,
        `Apply on-the-fly Cloudinary transformation URL parameters (f_auto, q_auto, w_800) for low-bandwidth mobile optimization.`,
        `Synthesize dynamic cover pages and canvas watermarks embedding contributor attribution before PDF download.`
      ],
      codeSnippet: (s) => `// Cloudinary Transformation Signature Engine
function generateUploadSignature(folder) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp: timestamp,
    folder: folder || 'dpgnotes_academic_docs'
  }, process.env.CLOUDINARY_API_SECRET);
  return { timestamp, signature, apiKey: process.env.CLOUDINARY_API_KEY };
}`,
      invariants: [
        "All academic documents must retain contributor attribution watermarks across all generated pages.",
        "Original high-resolution master PDFs must be protected behind signed URL access tokens.",
        "Automatic fallback to low-resolution cached thumbnails when client networks report 2G/3G speeds."
      ]
    },
    // 5. Database Schema
    5: {
      conceptPrefix: "Cloud Firestore manages the real-time operational state of DPGNotes across multi-region clusters with automatic sharding and zero server maintenance.",
      stepTemplate: (t) => [
        `Structure Firestore collections to partition documents, user metrics, advertisements, and audit history.`,
        `Denormalize frequently read author metadata onto resource documents to minimize billable read operations.`,
        `Deploy compound indexes on filtered search fields (stream, year, semester, date) to maintain sub-50ms query speeds.`,
        `Configure Firestore TTL policies to automatically purge ephemeral analytics and temporary share tokens after 14 days.`
      ],
      codeSnippet: (s) => `// Firestore Compound Query & Atomic Counter
import { query, collection, where, orderBy, limit, getDocs } from "firebase/firestore";

async function fetchCuratedResources(stream, discipline) {
  const q = query(
    collection(db, "documents"),
    where("stream", "==", stream),
    where("discipline", "==", discipline),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return await getDocs(q);
}`,
      invariants: [
        "Engagement counters (clicks, likes, shares, views) must only be incremented via atomic increment(1).",
        "Security rules must enforce owner-only write permissions on user profiles and uploaded resources.",
        "Database migrations must maintain backward compatibility with legacy document schemas."
      ]
    },
    // 6. Security Vault
    6: {
      conceptPrefix: "The Cryptographic Vault ensures that DPGNotes' core business logic and AI prompts run exclusively in encrypted memory without exposure on disk.",
      stepTemplate: (t) => [
        `Execute the CLI build tool (vault.js) to derive 256-bit AES keys from the master passphrase using PBKDF2.`,
        `Encrypt the server source file with AES-256-GCM generating ciphertext and a 128-bit authentication tag.`,
        `During production server bootstrap, decrypt the payload in-memory and compile using Node's vm.Script engine.`,
        `Execute the automated verify-vault.js test suite across all 5 security test suites before production deployment.`
      ],
      codeSnippet: (s) => `// Cryptographic Vault Initialization & Verification
const crypto = require('crypto');
const vm = require('vm');

function executeEncryptedPayload(ciphertext, key, iv, tag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const script = new vm.Script(decrypted.toString('utf8'), { filename: 'server.vault.vm' });
  script.runInThisContext();
}`,
      invariants: [
        "server.source.js is strictly git-ignored and never deployed in plaintext to production environments.",
        "Any bit-flip in ciphertext or invalid authentication tag causes immediate process shutdown (exit code 1).",
        "Master encryption keys must be sourced exclusively from environment variables."
      ]
    },
    // 7. AI Engine
    7: {
      conceptPrefix: "The multi-engine AI intelligence gateway powers the Legal Center AI Advisor, PDF Document Summarizer, and Assignment Solution Generator.",
      stepTemplate: (t) => [
        `Construct system prompts injecting academic integrity guidelines, university curriculum boundaries, and regulatory citations.`,
        `Dispatch inference queries to the primary Google Gemini API (Gemini 2.0 / 1.5 Pro).`,
        `Intercept quota exhaustion (HTTP 429) or upstream timeouts and trigger seamless fallback to xAI Grok.`,
        `Sanitize generated Markdown through DOMPurify before hydrating UI components.`
      ],
      codeSnippet: (s) => `// Multi-Engine AI Inference with Grok Fallback
async function queryAIEngine(prompt, systemInstruction) {
  try {
    return await callGeminiEngine(prompt, systemInstruction);
  } catch (geminiErr) {
    console.warn("Gemini cascade failed, switching to Grok fallback:", geminiErr.message);
    return await callGrokEngine(prompt, systemInstruction);
  }
}`,
      invariants: [
        "Zero direct insertion of raw AI markdown into the DOM; all content must pass DOMPurify sanitization.",
        "Fallback cascade between Gemini and Grok must execute transparently with sub-2 second response latency.",
        "System prompts must strictly prohibit generating examination solutions during live test hours."
      ]
    },
    // 8. Search Engine
    8: {
      conceptPrefix: "The DPGNotes Search Engine processes multi-field academic queries across document titles, subjects, syllabus codes, and faculty notes.",
      stepTemplate: (t) => [
        `Tokenize user queries on the client side with punctuation stripping and academic synonym expansion.`,
        `Query pre-cached in-memory tries for sub-10ms instant search suggestions during keyboard input.`,
        `Apply weighted multi-field relevance scoring (Title: 5x, Subject: 3x, Stream: 2x, Description: 1x).`,
        `Boost search ranking dynamically based on historical click-through rates (CTR) and contributor reputation.`
      ],
      codeSnippet: (s) => `// Weighted Relevance Scoring Formula
function calculateRelevanceScore(doc, queryTokens) {
  let score = 0;
  const title = (doc.title || '').toLowerCase();
  const subject = (doc.subject || '').toLowerCase();
  queryTokens.forEach(token => {
    if (title.includes(token)) score += 50;
    if (subject.includes(token)) score += 30;
  });
  return score + (doc.clicks || 0) * 0.1;
}`,
      invariants: [
        "Autocomplete suggestions must render within 15ms of user keystrokes using memory trie lookups.",
        "Zero-result queries must dynamically surface related academic syllabus alternatives.",
        "Search bot crawlers must be served pre-rendered OpenGraph metadata for optimal SEO indexation."
      ]
    },
    // 9. Video Ecosystem
    9: {
      conceptPrefix: "The Video Ecosystem provides university students with high-yield syllabus lecture recordings and sponsor-backed educational workshops.",
      stepTemplate: (t) => [
        `Initialize YouTube IFrame Player with custom overlay controls, theater mode toggling, and orientation lock.`,
        `Interleave curated syllabus lectures with sponsored educational partner advertisements.`,
        `Implement ephemeral VSH_ token share generation with double-write resilience (client setDoc + redundant backend POST).`,
        `Log screentime retention telemetry to verify genuine student viewership before awarding contributor reputation points.`
      ],
      codeSnippet: (s) => `// Double-Write Video Share Persistence
async function generateVideoShare(videoId, title) {
  const token = 'VSH_' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const data = { token, type: 'video', videoId, title, createdAt: new Date().toISOString() };
  await setDoc(doc(db, "share_links", token), data, { merge: true });
  fetch('/api/share/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {});
  return \`https://dpgnotes.web.app/dpgnotes-video.html?token=\${token}\`;
}`,
      invariants: [
        "Video share tokens must route exclusively to dpgnotes-video.html, never to the PDF viewer.",
        "Double-write persistence ensures zero link loss during client ad-blocker or network interference.",
        "Screentime tracking pauses automatically when the user switches browser tabs or minimizes the window."
      ]
    },
    // 10. Contributor RBAC
    10: {
      conceptPrefix: "The Role-Based Access Control (RBAC) model safeguards administrative portals while fostering an open academic contributor community.",
      stepTemplate: (t) => [
        `Enforce complete feature parity between email/password contributors and OAuth provider sign-ins.`,
        `Implement Contributor onboarding workflows validating university student/faculty credentials.`,
        `Compute reputation scores dynamically based on verified resource uploads, peer likes, and download metrics.`,
        `Build Admin Confidential Tab CRUD interface with date-threshold access approvals and automated revocation.`
      ],
      codeSnippet: (s) => `// Contributor RBAC Claim Verification
function verifyContributorAccess(userRecord, thresholdDate) {
  if (!userRecord || !userRecord.isVerified) return false;
  const now = new Date();
  const expiry = new Date(thresholdDate);
  return now <= expiry;
}`,
      invariants: [
        "Feature parity is mandatory: password contributors must access all tools available to OAuth users.",
        "Clearance gate access expires automatically at 23:59:59 on the administrator-assigned end date.",
        "All administrative approval and rejection actions must be recorded in an immutable audit ledger."
      ]
    },
    // 11. Legal Compliance
    11: {
      conceptPrefix: "The legal engineering subsystem enforces strict copyright compliance, DMCA notice-and-takedown workflows, and academic integrity regulations under DRASA.",
      stepTemplate: (t) => [
        `Publish standardized Terms of Service and Privacy Policies updated in synchronization with platform features.`,
        `Deploy automated DMCA takedown pipelines archiving contested materials within 24 hours of verified notice.`,
        `Execute automated 14-day ephemeral data cleansing to purge temporary chat sessions and tracking tokens.`,
        `Verify cookie consent banners and respect user Do Not Track (DNT) header preferences.`
      ],
      codeSnippet: (s) => `// Automated 14-Day Ephemeral Data Pruning
async function purgeExpiredTelemetryRecords() {
  const threshold = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
  const q = query(collection(db, "telemetry_logs"), where("createdAt", "<=", threshold));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}`,
      invariants: [
        "Contested copyrighted material must be suspended from public view immediately upon valid notice.",
        "Personal identifiable information (PII) must never be logged in public telemetry streams.",
        "DRASA academic standards require complete attribution to verified student/faculty authors."
      ]
    },
    // 12. DevOps CI/CD
    12: {
      conceptPrefix: "DevOps practices at DPGNotes guarantee 99.95% availability, zero-downtime releases, and comprehensive cloud telemetry monitoring across multi-cloud environments.",
      stepTemplate: (t) => [
        `Configure GitHub Actions workflows to execute automated linting, unit tests, and vault verification suites on every push.`,
        `Deploy static hosting assets to Firebase via firebase deploy --only hosting with edge cache invalidation.`,
        `Trigger Render backend rolling deployments via authenticated deploy webhooks.`,
        `Execute synthetic load tests simulating 10,000+ concurrent readers to verify database connection pool limits.`
      ],
      codeSnippet: (s) => `// GitHub Actions CI/CD Deployment Step
name: Deploy DPGNotes to Production
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Verify Security Vault
        run: node backend/security/verify-vault.js
      - name: Deploy Firebase Hosting
        run: npx firebase-tools deploy --only hosting --token "\${{ secrets.FIREBASE_TOKEN }}"`,
      invariants: [
        "Failed security vault verification tests must immediately abort CI/CD pipelines before deployment.",
        "Zero-downtime rolling deploys: backend instances must health-check successfully before terminating old pods.",
        "Comprehensive disaster recovery playbooks must ensure sub-15 minute recovery during cloud provider outages."
      ]
    }
  };

  const domain = domainTemplates[tab.id] || domainTemplates[1];

  return {
    srsTitle: `SRS Specification ${sec.num}: ${sec.title}`,
    concept: `${domain.conceptPrefix} Specifically, the ${sec.title} subsystem implements core requirements of SRS Section ${sec.num}, ensuring robust functionality, cryptographic integrity, and compliance across all client environments.`,
    steps: domain.stepTemplate(sec.title),
    code: domain.codeSnippet(sec),
    invariants: domain.invariants
  };
}

// ============================================================================
// UI RENDERING & SPA CONTROLLER (LEGAL CENTER ARCHITECTURE)
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

// Sidebar Groups & Module Items Builder
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
                <span class="tab-btn-title">${mod.id}. ${mod.title}</span>
              </div>
              <span class="tab-btn-badge">${mod.sections.length}</span>
            </button>
            <ul class="sidebar-subnav-list">
              ${mod.sections.map(sec => `
                <li>
                  <a href="#${sec.id}" class="sidebar-subnav-link" onclick="window.onSubNavClick(event, '${sec.id}', ${mod.id})">
                    ${sec.num} ${sec.title}
                  </a>
                </li>
              `).join('')}
            </ul>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

// Subnav Link Click Handler
window.onSubNavClick = function(e, secId, tabId) {
  if (tabId !== currentActiveTabIndex) {
    window.switchTab(tabId);
    setTimeout(() => {
      const el = document.getElementById(secId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }
  window.closeMobileSidebar();
};

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

// Render Tab Content with Legal Center Hierarchy & Collapsible Technical Data
function renderTabContent(tab) {
  const container = document.getElementById("tabContentContainer");
  if (!container) return;

  // Check in-memory cache
  if (tabCache.has(tab.id)) {
    container.innerHTML = tabCache.get(tab.id);
    initSubChapterScrollSpy(tab);
    return;
  }

  const customTab = FSD_TUTORIAL_REGISTRY[tab.id];
  const overviewDesc = customTab?.overview || tab.desc;
  const stepsIntro = customTab?.stepsIntro || "Follow the step-by-step Full Stack Development implementation workflow:";

  let sectionsHtml = "";
  tab.sections.forEach((sec, idx) => {
    const secNum = idx + 1;
    const secData = generateSubChapterContent(tab, sec);

    sectionsHtml += `
      <article class="overview-section" id="${sec.id}">
        
        <!-- Header Wrap -->
        <div class="section-header-wrap">
          <h2 class="section-title">
            <span class="section-num">${sec.num}</span>
            <span>${sec.title}</span>
          </h2>
          <div class="section-badges-group">
            <span class="section-badge badge-srs">SRS-REQ-${sec.num}</span>
            <span class="section-badge badge-tech">${sec.badge}</span>
          </div>
        </div>

        <!-- Section Body -->
        <div class="section-body">
          
          <!-- SRS Concept Overview -->
          <h3 class="subheading"><i class="ri-book-read-line"></i> ${secData.srsTitle}</h3>
          <p>${secData.concept}</p>

          <!-- Callout Card -->
          <div class="callout-box ${idx % 3 === 0 ? 'callout-tutorial' : idx % 3 === 1 ? 'callout-srs' : 'callout-security'}">
            <div class="callout-title">
              <i class="${idx % 3 === 0 ? 'ri-terminal-box-line' : idx % 3 === 1 ? 'ri-shield-check-line' : 'ri-lock-line'}"></i>
              ${idx % 3 === 0 ? 'FSD Tutorial Milestone & Engineering Invariant' : idx % 3 === 1 ? 'SRS Acceptance Criteria & Compliance' : 'Cryptographic Security & Data Invariant'}
            </div>
            ${secData.invariants[0] || 'Every subsystem request traversing this layer is verified against active cryptographic tokens and validated schema definitions.'}
          </div>

          <!-- Step-by-Step Practical Implementation Guide -->
          <h3 class="subheading"><i class="ri-list-check-3"></i> Step-by-Step Implementation Workflow</h3>
          <p>${stepsIntro}</p>
          <ol class="tutorial-steps">
            ${secData.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>

          <!-- Code Snippet -->
          <div class="code-block-wrap">
            <div class="code-header">
              <span><i class="ri-code-s-slash-line"></i> ${tab.slug}_${sec.id.replace(/-/g, '_')}.implementation.js</span>
              <button type="button" class="code-copy-btn" onclick="window.copyCodeSnippet(this)">
                <i class="ri-file-copy-line"></i> Copy
              </button>
            </div>
            <pre class="code-block"><code>${escapeHtml(secData.code)}</code></pre>
          </div>

          <!-- Production Invariants & Best Practices -->
          <h3 class="subheading"><i class="ri-checkbox-circle-line"></i> Architectural Invariants & Best Practices</h3>
          <ul class="spec-bullets">
            ${secData.invariants.map(inv => `<li><strong>Verified Invariant:</strong> ${inv}</li>`).join('')}
          </ul>

          <!-- Collapsible Technical Accordion (Hides Heavy Technical Data from Initial DOM) -->
          <details class="tech-spec-accordion">
            <summary class="tech-spec-summary">
              <span><i class="ri-terminal-box-line"></i> View Technical Specification, Payload &amp; Schema Spec</span>
              <i class="ri-arrow-down-s-line chevron"></i>
            </summary>
            <div class="tech-spec-content">
              <table class="overview-data-table">
                <thead>
                  <tr>
                    <th>Subsystem Parameter</th>
                    <th>Production Benchmark</th>
                    <th>Enforcement Mechanism</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Operational SLA</td>
                    <td>99.95% Continuous Uptime</td>
                    <td>Automated Health Probes &amp; Multi-Region Failover</td>
                  </tr>
                  <tr>
                    <td>Authorization Level</td>
                    <td>Level-3 Contributor Clearance</td>
                    <td>Firestore <code>confidential_overview_requests</code> Rule</td>
                  </tr>
                  <tr>
                    <td>Data Governance</td>
                    <td>Zero Data Leakage / Full Encryption</td>
                    <td>AES-256-GCM Vault &amp; TLS 1.3 Transport</td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
                Reference URL: <a href="https://dpgnotes.web.app/overview/index.html#${sec.id}">https://dpgnotes.web.app/overview/index.html#${sec.id}</a>
              </div>
            </div>
          </details>

        </div>
      </article>
    `;

    // Insert Native Ad after every 4 sections
    if (secNum % 4 === 0) {
      sectionsHtml += generateNativeAdHtml(secNum);
    }
  });

  const fullTabHtml = `
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

    <!-- MODULE BANNER HERO CARD WITH EXECUTIVE OVERVIEW -->
    <div class="tab-banner-card">
      <div class="tab-banner-meta">
        <span class="tab-index-badge">Module ${tab.id} of 12</span>
        <span class="badge-clearance"><i class="ri-shield-keyhole-line"></i> Level-3 Confidential</span>
        <span class="tab-read-time"><i class="ri-time-line"></i> ${tab.readTime}</span>
      </div>
      <h1 class="tab-main-title">${tab.title}</h1>
      
      <!-- Executive Architecture Overview Card -->
      <div class="module-overview-box">
        <div class="module-overview-heading">
          <i class="ri-compass-3-line"></i>
          <span>Executive Architectural Overview</span>
        </div>
        <p class="module-overview-text">${overviewDesc}</p>
        
        <!-- Core Tech Stack Pills -->
        <div class="module-tech-stack">
          <span class="tech-stack-label">Core Tech Stack:</span>
          ${(customTab?.techStack || ['Node.js', 'Vanilla JS', 'Firebase', 'Cloud Firestore', 'Render']).map(t => `<span class="tech-pill">${t}</span>`).join('')}
        </div>

        <!-- Key SRS Milestones -->
        <div class="module-deliverables">
          <div class="deliverables-title"><i class="ri-checkbox-circle-fill" style="color:var(--color-success);"></i> Key SRS Milestones &amp; Learning Objectives:</div>
          <ul class="deliverables-list">
            ${(customTab?.keyDeliverables || [
              'Understand the core architectural patterns and interface contracts.',
              'Implement production-grade full-stack features with security validation.',
              'Verify cross-device responsiveness and compliance with DRASA regulations.'
            ]).map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>

    <!-- SUB-CHAPTER QUICK PILLS (HORIZONTAL SCROLL TRACK) -->
    <div class="section-pills-bar" id="sectionPillsBar">
      ${tab.sections.map(s => `
        <a href="#${s.id}" class="section-pill-link" data-target-id="${s.id}">
          <span style="color:var(--color-primary-light); font-weight:800;">${s.num}</span>
          <span>${s.title}</span>
        </a>
      `).join('')}
    </div>

    <!-- SECTIONS -->
    ${sectionsHtml}

    <!-- MODULE FOOTER NAVIGATION -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:3.5rem; padding-top:1.75rem; border-top:1px solid var(--border-subtle);">
      ${tab.id > 1 ? `
        <button type="button" class="header-nav-link" onclick="window.switchTab(${tab.id - 1})">
          <i class="ri-arrow-left-line"></i> Previous: Module ${tab.id - 1}
        </button>
      ` : `<div></div>`}
      
      <a href="https://dpgnotes.web.app/dashboard.html" class="header-nav-link" style="background:rgba(99,102,241,0.15); color:#a5b4fc; border-color:rgba(99,102,241,0.35);">
        <i class="ri-dashboard-line"></i> Return to Contributor Dashboard
      </a>

      ${tab.id < 12 ? `
        <button type="button" class="header-nav-link" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#ffffff; border:none;" onclick="window.switchTab(${tab.id + 1})">
          Next: Module ${tab.id + 1} <i class="ri-arrow-right-line"></i>
        </button>
      ` : `<div></div>`}
    </div>
  `;

  // Store in memory cache
  tabCache.set(tab.id, fullTabHtml);
  container.innerHTML = fullTabHtml;

  // Initialize Scroll Spy for sub-chapters
  initSubChapterScrollSpy(tab);
}

// Sub-Chapter Active Highlighting (Scroll Spy)
function initSubChapterScrollSpy(tab) {
  const pills = document.querySelectorAll(".section-pill-link");
  const subLinks = document.querySelectorAll(".sidebar-subnav-link");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        
        // Update pills
        pills.forEach(p => {
          if (p.getAttribute("data-target-id") === id) {
            p.classList.add("active-pill");
            // Scroll pill into view smoothly
            p.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
          } else {
            p.classList.remove("active-pill");
          }
        });

        // Update sidebar sub-links
        subLinks.forEach(l => {
          if (l.getAttribute("href") === `#${id}`) {
            l.classList.add("active-sub");
          } else {
            l.classList.remove("active-sub");
          }
        });
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px" });

  tab.sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  });
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
