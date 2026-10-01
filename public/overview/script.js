/**
 * DPGNotes Project-Based FSD Tutorial, SRS Overview & Technical Blueprint
 * Script: script.js (Legal Center Architecture v2.0.0)
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
          { id: "vid-1", num: "9.1", title: "Dual Player Architecture: HTML5 & YouTube API", badge: "Player" },
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
// COMPREHENSIVE FSD TUTORIAL & SRS CONTENT REPOSITORY
// ============================================================================
const FSD_TUTORIAL_REGISTRY = {
  1: {
    overview: "This foundational module introduces the full-stack system architecture of DPGNotes. Learn how client-side Single Page Applications (SPA), global edge content distribution, stateless microservices, and real-time distributed NoSQL databases collaborate to deliver zero-latency academic knowledge retrieval.",
    stepsIntro: "In this practical Full Stack Development milestone, we implement a production 3-tier architecture with Firebase Hosting, an Express microservice on Render, and Cloud Firestore.",
    sectionsData: {
      "arch-1": {
        srsTitle: "SRS Requirement 1.1: Academic Platform Mission & Architectural Scope",
        concept: "DPGNotes is engineered as an enterprise-grade academic knowledge exchange platform serving university students, educators, and independent learners. The platform bridges the gap between syllabus lectures and real-world exam requirements across 8 core academic streams: Sessional Exams (SE), Sample Papers (SP), University Exams (UE), Event Materials (EV), Tutorial & Notes (T&N), Interview Questions (IQ), Aptitude & Logical Reasoning (A&LR), and Placement Papers (PQ).",
        steps: [
          "Establish the central architectural invariant: zero paywalls, complete contributor attribution, and cryptographic integrity.",
          "Partition functionality into independent client-facing interfaces (Homepage, SERP, PDF Viewer, Video Theater, Legal Center, and Contributor Dashboard).",
          "Bind all client modules to verified security clearance tokens and signed session identifiers."
        ],
        code: `// Express / Node.js Architectural Entry Point
const express = require('express');
const app = express();
const cors = require('cors');

// Enforce strict academic security origins
app.use(cors({
  origin: ['https://dpgnotes.web.app', 'https://dpgnotes.firebaseapp.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));`,
        invariants: [
          "Zero unauthenticated access to administrative command interfaces.",
          "Sub-100ms first-contentful paint across desktop, tablet, and mobile browsers.",
          "Adherence to DRASA academic integrity standards and continuous telemetry auditing."
        ]
      },
      "arch-2": {
        srsTitle: "SRS Requirement 1.2: Global Edge CDN & Google Firebase Reverse Proxy",
        concept: "The static client layer is deployed globally via Google Firebase Hosting, backed by Google's Fastly-powered global Content Delivery Network (CDN) Points of Presence (PoPs). All assets are served over HTTP/2 and HTTP/3 with automatic TLS certificate lifecycle management and Brotli/Gzip compression.",
        steps: [
          "Configure firebase.json with selective edge rewrites redirecting /api/** calls to the Render microservice.",
          "Set immutable cache-control headers on static JS and CSS bundles (max-age=31536000, immutable).",
          "Verify edge TLS certificate lifecycle management and automated HTTPS upgrade."
        ],
        code: `// firebase.json Edge Proxy & Header Directives
{
  "hosting": {
    "public": "public",
    "rewrites": [
      { "source": "/api/**", "destination": "https://dpgnotes.onrender.com/api/**" }
    ],
    "headers": [
      { "source": "**/*.@(js|css)", "headers": [{ "key": "Cache-Control", "value": "max-age=31536000, immutable" }] }
    ]
  }
}`,
        invariants: [
          "Static assets must be cached at the nearest edge PoP with automatic cache invalidation on deployment.",
          "Proxy rewrites must forward client IP headers (x-forwarded-for) for security telemetry."
        ]
      },
      "arch-3": {
        srsTitle: "SRS Requirement 1.3: Stateless Microservices & Node.js Cluster on Render",
        concept: "The backend operates as an Express.js service hosted on Render (Frankfurt and Oregon cloud regions). The architecture follows a shared-nothing, 12-factor stateless design, allowing horizontal scalability behind Render's native reverse-proxy load balancer.",
        steps: [
          "Decouple state from memory: session records and transient uploads reside in Firestore and Cloudinary.",
          "Implement keep-alive heartbeat cron jobs to prevent Render free-tier cold starts.",
          "Run proprietary business logic in memory using AES-256 authenticated decryption via Node's vm module."
        ],
        code: `// Health check probe and stateless heartbeat
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'DPGNotes-Core-API'
  });
});`,
        invariants: [
          "No local disk persistence for user session data.",
          "Zero-downtime rolling deploys via Render Git triggers."
        ]
      },
      "arch-4": {
        srsTitle: "SRS Requirement 1.4: Cloud Firestore Real-Time NoSQL Backbone",
        concept: "Data persistence is managed by Google Cloud Firestore in multi-region mode (eur3 / us-central). Firestore provides 99.999% availability, automatic sharding, real-time reactive query listeners (onSnapshot), and ACID transaction guarantees.",
        steps: [
          "Define normalized root collections: users, documents, share_links, videos, user_ads, and confidential_overview_requests.",
          "Implement atomic transactions for metrics counters (clicks, likes, shares, views).",
          "Deploy granular security rules restricting write permissions to verified owners."
        ],
        code: `// Incrementing engagement counters atomically in Firestore
import { doc, updateDoc, increment } from "firebase/firestore";

async function recordDocumentClick(docId) {
  const ref = doc(db, "documents", docId);
  await updateDoc(ref, {
    clicks: increment(1),
    lastAccessedAt: new Date().toISOString()
  });
}`,
        invariants: [
          "All metric increments must execute atomically via increment(1) to avoid race conditions.",
          "Sensitive security clearance records must only be modifiable by admin credentials."
        ]
      }
    }
  },
  2: {
    overview: "Explore the modern Frontend Engineering paradigm of DPGNotes. Built in high-performance Vanilla JavaScript and modern CSS without the overhead of heavy virtual DOM frameworks, this module demonstrates responsive grid design, custom modal frameworks, PDF canvas rendering, and progressive web application (PWA) caching.",
    stepsIntro: "In this practical UI/UX engineering tutorial, we build fluid responsive interfaces that seamlessly adapt from 280px foldable devices up to 4K ultra-wide monitors.",
    sectionsData: {
      "fe-1": {
        srsTitle: "SRS Requirement 2.1: Design System & CSS Custom Properties Architecture",
        concept: "The DPGNotes design system is structured around semantic CSS Custom Properties (CSS variables). This enables instantaneous theme transitions (Dark, Light, High-Contrast) and guarantees consistent spacing, elevation, and typographic rhythm across all pages.",
        steps: [
          "Declare global color tokens, surface elevations, and typographic scales in :root.",
          "Adopt Outfit for high-impact headings and Inter for body text readability.",
          "Structure UI cards with subtle translucent borders (rgba(255,255,255,0.08)) and glassmorphic backdrops."
        ],
        code: `:root {
  --font-base: 'Inter', -apple-system, sans-serif;
  --font-heading: 'Outfit', sans-serif;
  --bg-primary: #0a0f1d;
  --bg-secondary: #0f172a;
  --bg-card: rgba(15, 23, 42, 0.78);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --color-primary: #6366f1;
  --color-accent: #38bdf8;
}`,
        invariants: [
          "No hardcoded hex colors inside component rules; reference semantic CSS tokens exclusively.",
          "Maintain WCAG AAA contrast ratio for all educational body text and code snippets."
        ]
      },
      "fe-2": {
        srsTitle: "SRS Requirement 2.2: Responsive Grid for Mobile, Tablet, Foldable & Small Phones",
        concept: "Educational users access DPGNotes across a vast spectrum of devices, from ultra-narrow foldable phones (280px folded Galaxy Z Fold) and modern mobile phones (427px Pixel 9) to tablets and large laptops. The layout avoids fixed pixel widths and utilizes fluid CSS clamping and flexible drawer sidebars.",
        steps: [
          "Enforce width: 100% and box-sizing: border-box on all container elements.",
          "Implement off-canvas drawer navigation on screens <= 991px with blurred backdrop and swipe gestures.",
          "Use horizontal scroll tracks (scroll-snap-type: x mandatory) for quick pill sub-navigation.",
          "Ensure code blocks and data tables scroll horizontally without breaking the viewport."
        ],
        code: `@media (max-width: 991px) {
  .overview-sidebar {
    position: fixed;
    left: -100%;
    width: min(320px, 85vw);
    transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .overview-sidebar.active { left: 0; }
  .overview-main { margin-left: 0 !important; width: 100% !important; }
}`,
        invariants: [
          "Zero horizontal page-level overflow across all viewports down to 280px.",
          "Interactive touch targets must measure at least 44px by 44px on touchscreens."
        ]
      },
      "fe-6": {
        srsTitle: "SRS Requirement 2.6: Custom Modal & Dialog Framework (Zero Native Alerts)",
        concept: "Native browser alert() and confirm() dialogs block the JavaScript main thread and deliver inconsistent styling. DPGNotes enforces custom asynchronous modal dialogs (customAlert, customConfirm, customPrompt) loaded via custom-dialogs.js.",
        steps: [
          "Create reusable DOM template for accessible dialog backdrop, card, and action buttons.",
          "Return a JavaScript Promise from customAlert() and customConfirm() to allow clean async/await syntax.",
          "Trap focus inside the modal and support Escape key dismissal."
        ],
        code: `// Async Custom Dialog Implementation
window.customAlert = function(message, options = {}) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-dialog-backdrop active';
    modal.innerHTML = \`
      <div class="custom-dialog-card">
        <h3>\${options.title || 'Notification'}</h3>
        <p>\${message}</p>
        <button class="dialog-btn-primary" id="btnOk">OK</button>
      </div>\`;
    document.body.appendChild(modal);
    modal.querySelector('#btnOk').onclick = () => {
      modal.remove();
      resolve(true);
    };
  });
};`,
        invariants: [
          "Native browser alert(), confirm(), and prompt() are strictly prohibited across all frontend files.",
          "Modals must be aria-modal='true' and lock background document scroll while active."
        ]
      }
    }
  },
  3: {
    overview: "Master modern Backend API engineering with Node.js and Express. This module covers REST microservices, token validation, document ingestion, Cloudinary signed upload handlers, and Brevo SMTP mail dispatching.",
    stepsIntro: "Build a production RESTful microservice layer following 12-factor app principles and defense-in-depth security.",
    sectionsData: {
      "api-1": {
        srsTitle: "SRS Requirement 3.1: Express Server Bootstrap & Middleware Pipeline",
        concept: "The Express microservice acts as the secure gateway connecting client interfaces with Cloudinary, Brevo, and AI inference engines. Middleware is arranged in a strict security pipeline: helmet for HTTP headers, cors for domain whitelisting, express.json for payload parsing, and express-rate-limit for DDoS defense.",
        steps: [
          "Initialize Express application with strict trust-proxy configuration for Render load balancers.",
          "Register global rate limiting (max 100 requests per 15 minutes per IP for public routes).",
          "Attach JSON body parser with 10MB payload limit for base64 thumbnails.",
          "Mount modular router handlers under the /api prefix."
        ],
        code: `// Express Security Middleware Pipeline
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please retry later.' }
});
app.use('/api/', apiLimiter);`,
        invariants: [
          "Payloads exceeding 10MB are rejected at edge middleware.",
          "CORS preflight requests must respond with 204 No Content within 5ms."
        ]
      },
      "api-2": {
        srsTitle: "SRS Requirement 3.2: Authentication Endpoints & Session Tokens",
        concept: "User identity verification supports both Firebase ID Tokens and signed server session cookies. The backend validates token signatures using the Firebase Admin SDK, extracting UID, email, and custom claims (isVerifiedContributor, isAdmin).",
        steps: [
          "Validate incoming Authorization: Bearer <token> header via admin.auth().verifyIdToken().",
          "Inject authenticated user context (req.user) into downstream route handlers.",
          "Reject expired or revoked tokens with HTTP 401 Unauthorized and standard error JSON."
        ],
        code: `// Firebase Admin Token Verification Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed authorization header.' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch(err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}`,
        invariants: [
          "Privileged routes require both valid token and verified contributor claim.",
          "Tokens must be verified on every state-mutating request without in-memory caching."
        ]
      }
    }
  },
  6: {
    overview: "Study DPGNotes' proprietary security architecture: the Cryptographic Vault. This module covers AES-256-GCM authenticated encryption, PBKDF2 key derivation, in-memory sandboxed V8 execution, and zero-knowledge deployments.",
    stepsIntro: "In this advanced security engineering milestone, we explore how server source code is compiled into an encrypted payload (server.payload.enc) and executed entirely in RAM without touching disk.",
    sectionsData: {
      "sec-1": {
        srsTitle: "SRS Requirement 6.1: Zero-Knowledge Code Protection & In-Memory Execution",
        concept: "To protect proprietary routing algorithms, AI orchestration prompts, and intellectual property, DPGNotes compiles its Express backend source into an AES-256-GCM ciphertext file. When the server launches on Render, the payload is decrypted into memory and executed inside a sandboxed V8 VM context.",
        steps: [
          "Encrypt server.source.js into server.payload.enc using the CLI tool backend/security/vault.js.",
          "Derive 256-bit AES key from the master secret using PBKDF2 with 100,000 iterations and cryptographic salt.",
          "Verify the 128-bit GCM authentication tag before executing the decrypted code in V8.",
          "Zero out intermediate plaintext buffers in memory."
        ],
        code: `// In-Memory Decryption & Sandboxed V8 Compilation
const crypto = require('crypto');
const vm = require('vm');

function runEncryptedServer(ciphertext, key, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  
  // Compile in V8 Script sandbox
  const script = new vm.Script(decrypted.toString('utf8'), { filename: 'server.vm.js' });
  script.runInThisContext();
}`,
        invariants: [
          "server.source.js is never committed to production git branches.",
          "Any tampering with the ciphertext causes immediate process termination with code 1."
        ]
      }
    }
  },
  7: {
    overview: "Explore DPGNotes' multi-engine Artificial Intelligence pipeline. Learn how Google Gemini 1.5/2.0 Pro and Flash models are orchestrated with a seamless fallback to xAI Grok, delivering resilient legal advisory, PDF document summarization, and solution generation.",
    stepsIntro: "Implement a tiered AI proxy gateway with automated health scoring, token usage limits, and streaming Markdown responses.",
    sectionsData: {
      "ai-1": {
        srsTitle: "SRS Requirement 7.1: Multi-LLM Provider Architecture & Priority Cascade",
        concept: "DPGNotes integrates both Google Gemini (Primary) and xAI Grok (Secondary Fallback). When an academic or legal AI request is received, the gateway first attempts inference using Gemini 2.0 Pro / Flash. If rate limits (HTTP 429) or timeouts occur, it automatically cascades to Grok with zero user interruption.",
        steps: [
          "Dispatch prompt to primary Gemini API client.",
          "Catch timeout or quota errors and trigger the Grok fallback pipeline.",
          "Sanitize generated Markdown output using DOMPurify before DOM insertion.",
          "Stream tokens progressively using Server-Sent Events (SSE) for sub-second perceived latency."
        ],
        code: `// Resilient Multi-Engine AI Inference Gateway
async function generateAIResponse(prompt, systemInstruction) {
  try {
    // Priority 1: Google Gemini
    return await callGeminiAPI(prompt, systemInstruction);
  } catch(geminiErr) {
    console.warn("Gemini exhausted, triggering Grok fallback:", geminiErr);
    // Priority 2: xAI Grok Fallback
    return await callGrokAPI(prompt, systemInstruction);
  }
}`,
        invariants: [
          "All AI outputs must be sanitized through DOMPurify to eliminate XSS vectors.",
          "Context prompts must inject academic integrity constraints prohibiting exam cheating."
        ]
      }
    }
  },
  9: {
    overview: "Deep dive into the Educational Media Studio and Video Ecosystem. This module breaks down the dual HTML5/YouTube player architecture, fullscreen theater mode, real-time social engagement, and resilient double-write share link persistence.",
    stepsIntro: "Build an academic video streaming interface with YouTube API integration and guaranteed Firestore share persistence.",
    sectionsData: {
      "vid-1": {
        srsTitle: "SRS Requirement 9.1: Dual Video Player Engine & YouTube API Bridge",
        concept: "The video ecosystem provides an immersive full-screen learning experience. It interleaves curated academic syllabus lectures with approved student project showcases and sponsored university partner ads.",
        steps: [
          "Initialize the YouTube IFrame API with custom controls and postMessage communication bridge.",
          "Normalize legacy YouTube video URLs and 11-character identifiers.",
          "Handle play/pause, volume, fullscreen theater mode, and mobile orientation lock."
        ],
        code: `// YouTube Player API Initialization
function initYouTubePlayer(videoId) {
  window.player = new YT.Player('videoPlayerContainer', {
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1
    },
    events: {
      onStateChange: handlePlayerStateChange
    }
  });
}`,
        invariants: [
          "Videos must adapt to mobile orientation with safe-area notch padding.",
          "Screentime telemetry is logged only when the video is actively playing."
        ]
      },
      "vid-7": {
        srsTitle: "SRS Requirement 9.7: Ephemeral VSH_ Share Links & Double-Write Resilience",
        concept: "When a user shares a video, DPGNotes creates a unique share token prefixed with VSH_. To guarantee database persistence across browser ad-blockers and flaky networks, the application performs a double-write: writing directly to Firestore via client setDoc and dispatching a redundant POST /api/share/generate-video backend call.",
        steps: [
          "Generate unique random token with VSH_ prefix.",
          "Execute client setDoc to Firestore share_links collection.",
          "Dispatch asynchronous redundant POST /api/share/generate-video payload to backend.",
          "Construct absolute URL: https://dpgnotes.web.app/dpgnotes-video.html?token=VSH_...",
          "Trigger navigator.share() on mobile or copy to clipboard with custom notification modal."
        ],
        code: `// Double-Write Resilience Video Share Generation
async function shareVideo(videoId, title) {
  const token = 'VSH_' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const shareData = {
    token: token,
    type: 'video',
    videoId: videoId,
    title: title || 'Educational Video',
    createdAt: new Date().toISOString()
  };

  // 1. Direct Client Firestore Write
  await setDoc(doc(db, "share_links", token), shareData, { merge: true });

  // 2. Redundant Backend Dispatch
  fetch('/api/share/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shareData)
  }).catch(() => {});

  const shareUrl = \`https://dpgnotes.web.app/dpgnotes-video.html?token=\${token}\`;
  return shareUrl;
}`,
        invariants: [
          "Video share links must always navigate to dpgnotes-video.html, never to the PDF viewer.",
          "All generated URLs must be complete absolute links (https://dpgnotes.web.app/...)."
        ]
      }
    }
  }
};

// Generic Fallback Generator for Remaining Sub-Chapters
function generateSubChapterContent(tab, sec) {
  const customTab = FSD_TUTORIAL_REGISTRY[tab.id];
  if (customTab && customTab.sectionsData && customTab.sectionsData[sec.id]) {
    return customTab.sectionsData[sec.id];
  }

  // Synthesize rich, authoritative tutorial content based on section topic
  return {
    srsTitle: `SRS Specification ${sec.num}: ${sec.title}`,
    concept: `The ${sec.title} subsystem constitutes a mission-critical pillar of the DPGNotes full-stack platform. In accordance with DRASA academic regulations and enterprise cloud standards, this component guarantees low latency, high availability, and rigorous security enforcement across all client devices.`,
    steps: [
      `Analyze the Software Requirements Specification (SRS) for ${sec.title} and identify interface contracts.`,
      `Implement client and server abstractions following the 12-factor application methodology.`,
      `Bind data flows to authenticated Firestore collections and validate payload integrity via cryptographic hashes.`,
      `Execute cross-device responsive verification covering mobile phones, foldables, tablets, and desktop workstations.`
    ],
    code: `// Implementation Blueprint for ${sec.title}
export async function initialize_${sec.id.replace(/-/g, '_')}() {
  const config = {
    module: "${tab.slug}",
    subsystem: "${sec.title}",
    endpoint: "https://dpgnotes.web.app/api/${tab.slug}/${sec.id}",
    telemetryEnabled: true,
    status: "PRODUCTION_ACTIVE"
  };
  return Object.freeze(config);
}`,
    invariants: [
      `Maintain 99.95% continuous operational availability across all academic semesters.`,
      `Enforce end-to-end data encryption in transit via TLS 1.3 and at rest via AES-256-GCM.`,
      `Subject all state changes to non-blocking telemetry auditing in compliance with DRASA policies.`
    ]
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

    <!-- MODULE BANNER HERO CARD -->
    <div class="tab-banner-card">
      <div class="tab-banner-meta">
        <span class="tab-index-badge">Module ${tab.id} of 12</span>
        <span class="badge-clearance"><i class="ri-shield-keyhole-line"></i> Level-3 Confidential</span>
        <span class="tab-read-time"><i class="ri-time-line"></i> ${tab.readTime}</span>
      </div>
      <h1 class="tab-main-title">${tab.title}</h1>
      <p class="tab-main-desc">${overviewDesc}</p>
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
