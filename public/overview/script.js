/**
 * DPGNotes Confidential System Overview & Technical Blueprint
 * Script: script.js
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

// 12 Tabs Definitions with Navigational Sections
window.OVERVIEW_TABS = [
  {
    id: 1,
    slug: "architecture",
    title: "Platform Architecture & System Topography",
    icon: "ri-cpu-line",
    readTime: "12 min read",
    desc: "Complete architectural blueprint of DPGNotes: microservices ecosystem, client-server topology, edge routing, caching layers, and high-availability patterns.",
    sections: [
      { id: "arch-1", num: "1.1", title: "Enterprise System Overview & Core Mission", badge: "Core" },
      { id: "arch-2", num: "1.2", title: "Edge Network & Global Distribution Model", badge: "Network" },
      { id: "arch-3", num: "1.3", title: "Stateless Microservices & Node.js Cluster", badge: "Backend" },
      { id: "arch-4", num: "1.4", title: "Cloud Firestore Real-Time NoSQL Backbone", badge: "Database" },
      { id: "arch-5", num: "1.5", title: "Cross-Origin Security & CORS Middleware", badge: "Security" },
      { id: "arch-6", num: "1.6", title: "Dynamic Routing & SPA Navigation Engine", badge: "Client" },
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
    desc: "In-depth breakdown of the client-side design system, responsive breakpoints, foldable device support, DOM lifecycle, and UI component architecture.",
    sections: [
      { id: "fe-1", num: "2.1", title: "Design System & CSS Custom Properties", badge: "Design" },
      { id: "fe-2", num: "2.2", title: "Foldable & Dual-Screen Layout Adaptations", badge: "Responsive" },
      { id: "fe-3", num: "2.3", title: "Glassmorphism & Surface Elevation Hierarchy", badge: "Styling" },
      { id: "fe-4", num: "2.4", title: "Single Page Application (SPA) State Containers", badge: "State" },
      { id: "fe-5", num: "2.5", title: "DOM Lifecycle & Performance Optimization", badge: "Performance" },
      { id: "fe-6", num: "2.6", title: "Custom Modal & Dialog Component Framework", badge: "Components" },
      { id: "fe-7", num: "2.7", title: "Client-Side Search Suggestions & Debounce Mechanics", badge: "Search" },
      { id: "fe-8", num: "2.8", title: "Interactive Canvas & PDF Rendering Engine", badge: "Media" },
      { id: "fe-9", num: "2.9", title: "Theme Switching Engine: Dark, Light & Emerald", badge: "Themes" },
      { id: "fe-10", num: "2.10", title: "PWA Service Worker & Offline Asset Caching", badge: "PWA" },
      { id: "fe-11", num: "2.11", title: "Web Accessibility (A11y) & ARIA Compliance", badge: "A11y" },
      { id: "fe-12", num: "2.12", title: "Mobile Touch Gestures & Inertial Scrolling", badge: "Mobile" }
    ]
  },
  {
    id: 3,
    slug: "backend-api",
    title: "Express Backend, Server API Endpoints & Microservices",
    icon: "ri-server-line",
    readTime: "15 min read",
    desc: "Exhaustive documentation of the Node.js / Express backend service on Render, REST endpoints, JWT verification, and telemetry dispatchers.",
    sections: [
      { id: "api-1", num: "3.1", title: "Express Server Bootstrap & Middleware Pipeline", badge: "Core" },
      { id: "api-2", num: "3.2", title: "Authentication Endpoints & Session Tokens", badge: "Auth" },
      { id: "api-3", num: "3.3", title: "Document Management & Metadata Upload API", badge: "CRUD" },
      { id: "api-4", num: "3.4", title: "AI Intelligence Query & Proxy Gateway", badge: "AI" },
      { id: "api-5", num: "3.5", title: "Sponsored Ads Submissions & Review Workflow", badge: "Ads" },
      { id: "api-6", num: "3.6", title: "Telemetry Tracking: Views, Clicks & Screentime", badge: "Telemetry" },
      { id: "api-7", num: "3.7", title: "Administrative Command Center Protected Routes", badge: "Admin" },
      { id: "api-8", num: "3.8", title: "Brevo SMTP Mail Service & Strict Notification Policy", badge: "Email" },
      { id: "api-9", num: "3.9", title: "Social Networking, Connection & Chat Endpoints", badge: "Social" },
      { id: "api-10", num: "3.10", title: "Rate Limiting & Denial-of-Service Defense", badge: "Security" },
      { id: "api-11", num: "3.11", title: "Python Bridge: Child Process Data Processing", badge: "Python" },
      { id: "api-12", num: "3.12", title: "Health Checks, Heartbeat & Uptime Monitoring", badge: "DevOps" }
    ]
  },
  {
    id: 4,
    slug: "cloudinary-media",
    title: "Cloudinary Media Pipeline & PDF Processing Engine",
    icon: "ri-image-line",
    readTime: "13 min read",
    desc: "Technical analysis of the cloud storage pipeline: Cloudinary transformations, PDF page counting, cover page generator, and watermarking.",
    sections: [
      { id: "cloud-1", num: "4.1", title: "Cloudinary Asset Architecture & Storage Quotas", badge: "Storage" },
      { id: "cloud-2", num: "4.2", title: "Direct Upload & Multi-part Streaming Pipeline", badge: "Upload" },
      { id: "cloud-3", num: "4.3", title: "Dynamic PDF Page Counting & Size Inspection", badge: "PDF" },
      { id: "cloud-4", num: "4.4", title: "A4 300 DPI Cover Page Generation Pipeline", badge: "Generator" },
      { id: "cloud-5", num: "4.5", title: "PDF Watermarking & Contributor Attribution", badge: "Security" },
      { id: "cloud-6", num: "4.6", title: "Automated Thumbnail Extraction for Previews", badge: "Transform" },
      { id: "cloud-7", num: "4.7", title: "Image-to-PDF Conversion & Compression Engine", badge: "Utility" },
      { id: "cloud-8", num: "4.8", title: "CDN Delivery Optimization & WebP/AVIF Formats", badge: "CDN" },
      { id: "cloud-9", num: "4.9", title: "Secure Asset Deletion & Garbage Collection", badge: "Lifecycle" },
      { id: "cloud-10", num: "4.10", title: "Signed URLs & Ephemeral Access Tokens", badge: "Access" },
      { id: "cloud-11", num: "4.11", title: "Storage Fallbacks & Zero-Data-Loss Architecture", badge: "Resilience" }
    ]
  },
  {
    id: 5,
    slug: "database-schema",
    title: "Firestore Database Schema, Telemetry & Data Modeling",
    icon: "ri-database-2-line",
    readTime: "14 min read",
    desc: "Comprehensive specification of collections, documents, composite indexes, real-time listeners, and telemetry analytics models.",
    sections: [
      { id: "db-1", num: "5.1", title: "Firestore NoSQL Architecture & Data Normalization", badge: "Schema" },
      { id: "db-2", num: "5.2", title: "`users` Collection & Contributor Profile Schema", badge: "Users" },
      { id: "db-3", num: "5.3", title: "`documents` Collection: 8 Academic Streams", badge: "Documents" },
      { id: "db-4", num: "5.4", title: "`user_ads` Collection & Impression Counters", badge: "Ads" },
      { id: "db-5", num: "5.5", title: "`videos` Collection: Academic & Sponsored Media", badge: "Videos" },
      { id: "db-6", num: "5.6", title: "`activity_logs` & Granular Event Audit Trail", badge: "Logs" },
      { id: "db-7", num: "5.7", title: "`share_links` & Virality Tracking Tokens", badge: "Shares" },
      { id: "db-8", num: "5.8", title: "`confidential_overview_requests` Access Gate Model", badge: "Gate" },
      { id: "db-9", num: "5.9", title: "`confidential_read_history` Security Audit Logs", badge: "Audit" },
      { id: "db-10", num: "5.10", title: "Atomic Transactions, Batches & Concurrency Controls", badge: "Transactions" },
      { id: "db-11", num: "5.11", title: "Firestore Rules Validation & Constraint Enforcements", badge: "Rules" },
      { id: "db-12", num: "5.12", title: "Composite Index Optimization & Query Profiling", badge: "Indexes" }
    ]
  },
  {
    id: 6,
    slug: "security-vault",
    title: "Security Policies, AES-256 Vault, 2FA & DRASA Protocol",
    icon: "ri-shield-keyhole-line",
    readTime: "16 min read",
    desc: "Rigorous analysis of proprietary source encryption (AES-256-GCM), tamper resistance, Admin Two-Factor Authentication, and DRASA suspension protocols.",
    sections: [
      { id: "sec-1", num: "6.1", title: "AES-256-GCM Vault & In-Memory Server Execution", badge: "Vault" },
      { id: "sec-2", num: "6.2", title: "HMAC Tamper-Proof Payload Verification & Bit-Flip Detection", badge: "Integrity" },
      { id: "sec-3", num: "6.3", title: "Admin Two-Factor Authentication (2FA) & Dynamic OTPs", badge: "2FA" },
      { id: "sec-4", num: "6.4", title: "Role-Based Access Control (RBAC) & Principle of Least Privilege", badge: "RBAC" },
      { id: "sec-5", num: "6.5", title: "Email Domain DNS-over-HTTPS (DoH) MX Validation", badge: "DNS" },
      { id: "sec-6", num: "6.6", title: "DRASA Suspension Protocol & Permanent Block Directory", badge: "DRASA" },
      { id: "sec-7", num: "6.7", title: "Confidential Overview Gatekeeper & Date Threshold Engine", badge: "Gatekeeper" },
      { id: "sec-8", num: "6.8", title: "Content Security Policy (CSP), HSTS & Clickjacking Defense", badge: "Headers" },
      { id: "sec-9", num: "6.9", title: "Malware & Harmful Content Screening via AI Scanner", badge: "AI Security" },
      { id: "sec-10", num: "6.10", title: "16-Character High-Entropy Contributor Deletion Tokens", badge: "Tokens" },
      { id: "sec-11", num: "6.11", title: "Automated IP Blacklisting & Anomaly Rate Limiters", badge: "Firewall" },
      { id: "sec-12", num: "6.12", title: "Zero Trust Architecture & End-to-End Cryptography", badge: "Zero Trust" }
    ]
  },
  {
    id: 7,
    slug: "ai-engine",
    title: "AI Engine Orchestration (Gemini & Grok Fallback System)",
    icon: "ri-brain-line",
    readTime: "13 min read",
    desc: "Architecture of DPGNotes dual AI cognitive engine: Gemini 1.5 Pro/Flash orchestration with seamless automated fallback to Grok (xAI) for 100% uptime.",
    sections: [
      { id: "ai-1", num: "7.1", title: "Dual AI Engine Design Philosophy & Uptime Guarantees", badge: "Orchestration" },
      { id: "ai-2", num: "7.2", title: "Gemini Higher-to-Lower Tier Resolution Algorithm", badge: "Gemini" },
      { id: "ai-3", num: "7.3", title: "Grok (xAI) Fallback Circuit Breaker & Failover Recovery", badge: "Grok" },
      { id: "ai-4", num: "7.4", title: "Context Window Management & Prompt Conditioning", badge: "NLP" },
      { id: "ai-5", num: "7.5", title: "Academic Solution Generator & Step-by-Step Proofs", badge: "Solutions" },
      { id: "ai-6", num: "7.6", title: "PDF Viewer Contextual AI Question-Answering", badge: "PDF AI" },
      { id: "ai-7", num: "7.7", title: "Controversial / Harmful Content Flagging Classifier", badge: "Safety" },
      { id: "ai-8", num: "7.8", title: "Executive Telemetry Synthesis & Admin AI Reports", badge: "Reports" },
      { id: "ai-9", num: "7.9", title: "Rate-Limit Throttling & API Key Rotation Pool", badge: "Resilience" },
      { id: "ai-10", num: "7.10", title: "AI Academic Model Training & Subject Vector Database", badge: "Training" },
      { id: "ai-11", num: "7.11", title: "Future Roadmap: Self-Hosted On-Device Slm Models", badge: "Roadmap" }
    ]
  },
  {
    id: 8,
    slug: "search-engine",
    title: "Search Engine Infrastructure & SERP Architecture",
    icon: "ri-search-eye-line",
    readTime: "12 min read",
    desc: "Deep-dive into DPGNotes proprietary educational search engine: tokenization, fuzzy matching, ranking algorithms, CTR telemetry, and SERP interface.",
    sections: [
      { id: "se-1", num: "8.1", title: "Search Architecture & Query Ingestion Pipeline", badge: "Search" },
      { id: "se-2", num: "8.2", title: "Tokenization, Stemming & Academic Synonyms", badge: "NLP" },
      { id: "se-3", num: "8.3", title: "Multi-Field Weighted Relevance Ranking Formula", badge: "Ranking" },
      { id: "se-4", num: "8.4", title: "Click-Through-Rate (CTR) Feedback Telemetry Loop", badge: "Telemetry" },
      { id: "se-5", num: "8.5", title: "Instant Auto-Suggestions & Query Autocomplete", badge: "UX" },
      { id: "se-6", num: "8.6", title: "SERP Tabbed Navigation: All, AI Overview, Websites, Notes", badge: "SERP" },
      { id: "se-7", num: "8.7", title: "Filter Matrix: Streams, Years, Disciplines & Institutions", badge: "Filters" },
      { id: "se-8", num: "8.8", title: "Zero-Result Intelligence & Suggested Alternative Topics", badge: "Fallback" },
      { id: "se-9", num: "8.9", title: "Search Bot Crawling, Sitemap.xml & Google Indexing", badge: "SEO" },
      { id: "se-10", num: "8.10", title: "Semantic Knowledge Graph & Subject Node Linking", badge: "Graph" },
      { id: "se-11", num: "8.11", title: "SERP Performance Tuning: Sub-50ms Query Benchmarks", badge: "Speed" }
    ]
  },
  {
    id: 9,
    slug: "video-ecosystem",
    title: "Educational Media Studio & Video Ecosystem",
    icon: "ri-video-line",
    readTime: "11 min read",
    desc: "Comprehensive design of the educational video player: full-screen playback, academic vs sponsored switching, YouTube API integration, and engagement telemetry.",
    sections: [
      { id: "vid-1", num: "9.1", title: "Video Player Architecture & HTML5/YouTube Dual Engine", badge: "Player" },
      { id: "vid-2", num: "9.2", title: "Predefined Academic Video Library & Curation Criteria", badge: "Academic" },
      { id: "vid-3", num: "9.3", title: "Sponsored Video Campaigns & Commercial Integration", badge: "Ads" },
      { id: "vid-4", num: "9.4", title: "Dynamic Pool Switching: Academic vs Sponsored Ad Stream", badge: "Switching" },
      { id: "vid-5", num: "9.5", title: "Full-Screen Immersive Theater Mode & Mobile Orientation", badge: "Display" },
      { id: "vid-6", num: "9.6", title: "Social Engagement: Contributor Likes & Real-Time Sync", badge: "Likes" },
      { id: "vid-7", num: "9.7", title: "Native Chrome / Web Share API with Ephemeral Tokens", badge: "Share" },
      { id: "vid-8", num: "9.8", title: "Video Analytics: View Retention & Screentime Auditing", badge: "Analytics" },
      { id: "vid-9", num: "9.9", title: "Case-Sensitivity Repair Map for Legacy YouTube IDs", badge: "Fixes" },
      { id: "vid-10", num: "9.10", title: "Moderation Queue & Video Campaign Approval Rules", badge: "Moderation" },
      { id: "vid-11", num: "9.11", title: "Bandwidth Conservation & Adaptive Bitrate Optimization", badge: "Performance" }
    ]
  },
  {
    id: 10,
    slug: "contributor-rbac",
    title: "Contributor Ecosystem & Role-Based Access Control (RBAC)",
    icon: "ri-team-line",
    readTime: "12 min read",
    desc: "Specification of user roles, contributor lifecycle, credential tiers, quota honors, verified badges, and collaborative networking features.",
    sections: [
      { id: "user-1", num: "10.1", title: "Identity Tiers: Guest, Contributor & System Admin", badge: "Identity" },
      { id: "user-2", num: "10.2", title: "Contributor Onboarding & Verification Protocol", badge: "Onboarding" },
      { id: "user-3", num: "10.3", title: "Password Authentication vs OAuth Auth Providers", badge: "Auth" },
      { id: "user-4", num: "10.4", title: "Milestone Honours & Reputation Score Computation", badge: "Gamification" },
      { id: "user-5", num: "10.5", title: "Contributor Dashboard Metrics & Real-Time Telemetry", badge: "Dashboard" },
      { id: "user-6", num: "10.6", title: "Social Following, Peer Connections & In-App Messaging", badge: "Social" },
      { id: "user-7", num: "10.7", title: "Upload Quotas, File Integrity Checks & DRASA Compliance", badge: "Quotas" },
      { id: "user-8", num: "10.8", title: "Data Privacy & Contributor Account Deletion Protocols", badge: "GDPR" },
      { id: "user-9", num: "10.9", title: "Referral Ecosystem & Community Invitation Rewards", badge: "Referrals" },
      { id: "user-10", num: "10.10", title: "Session Storage & Multi-Device Token Persistence", badge: "Sessions" },
      { id: "user-11", num: "10.11", title: "Contributor Code of Conduct & Honor Regulations", badge: "Ethics" }
    ]
  },
  {
    id: 11,
    slug: "legal-compliance",
    title: "Legal Center, DMCA, Privacy & Compliance Policies",
    icon: "ri-scales-3-line",
    readTime: "14 min read",
    desc: "Detailed documentation of DPGNotes legal governance: DMCA notice-and-takedown, DRASA framework, COPPA/GDPR compliance, and privacy terms.",
    sections: [
      { id: "leg-1", num: "11.1", title: "Legal Center Architecture & Policy Navigation", badge: "Legal" },
      { id: "leg-2", num: "11.2", title: "Terms and Conditions & Academic Open-Access Agreement", badge: "Terms" },
      { id: "leg-3", num: "11.3", title: "Privacy Policy & Personal Identifiable Information (PII)", badge: "Privacy" },
      { id: "leg-4", num: "11.4", title: "DMCA Notice-and-Takedown Compliance Procedure", badge: "DMCA" },
      { id: "leg-5", num: "11.5", title: "Copyright Ownership & Attribution Standards", badge: "Copyright" },
      { id: "leg-6", num: "11.6", title: "Data Retention & Automated 14-Day Ephemeral Cleansing", badge: "Retention" },
      { id: "leg-7", num: "11.7", title: "Cookie Consent & LocalStorage Governance Rules", badge: "Cookies" },
      { id: "leg-8", num: "11.8", title: "Advertising Standards & Commercial Disclosure Rules", badge: "Advertising" },
      { id: "leg-9", num: "11.9", title: "DRASA Institutional Disciplinary Framework", badge: "DRASA" },
      { id: "leg-10", num: "11.10", title: "External Links & Third-Party Content Disclaimer", badge: "Disclaimer" },
      { id: "leg-11", num: "11.11", title: "Grievance Officer Redressal Channel & SLA Protocols", badge: "Grievance" },
      { id: "leg-12", num: "11.12", title: "Jurisdiction, Arbitration & Dispute Resolution Model", badge: "Jurisdiction" }
    ]
  },
  {
    id: 12,
    slug: "devops-cicd",
    title: "DevOps, Firebase Hosting, CI/CD & Disaster Recovery",
    icon: "ri-git-branch-line",
    readTime: "13 min read",
    desc: "Operations architecture: GitHub continuous delivery, Firebase Hosting caching layers, Render production provisioning, and security backups.",
    sections: [
      { id: "ops-1", num: "12.1", title: "Git Workflow & Branching Architecture (`main`)", badge: "Git" },
      { id: "ops-2", num: "12.2", title: "Automated Source Encryption Pre-Commit Hooks", badge: "Vault" },
      { id: "ops-3", num: "12.3", title: "Firebase Hosting Configuration & Rewrites Rules", badge: "Firebase" },
      { id: "ops-4", num: "12.4", title: "Render Production Web Service Provisioning", badge: "Render" },
      { id: "ops-5", num: "12.5", title: "Continuous Deployment (CD) Zero-Downtime Releases", badge: "CI/CD" },
      { id: "ops-6", num: "12.6", title: "Environment Secrets Management & Key Separation", badge: "Secrets" },
      { id: "ops-7", num: "12.7", title: "Automated Daily Firestore Cloud Backups", badge: "Backups" },
      { id: "ops-8", num: "12.8", title: "Error Telemetry & Synthetic Health Probes", badge: "Monitoring" },
      { id: "ops-9", num: "12.9", title: "Lighthouse 100 Performance & SEO Optimization", badge: "Lighthouse" },
      { id: "ops-10", num: "12.10", title: "Security Vulnerability Audits (npm audit / Snyk)", badge: "Audits" },
      { id: "ops-11", num: "12.11", title: "Local Working Directory Safe Deletion & Recovery Runbook", badge: "Runbook" }
    ]
  }
];

// Initialize Player & Access Gate
document.addEventListener("DOMContentLoaded", () => {
  initMobileControls();
  renderSidebarNav();
  checkAuthAndClearanceGate();
});

// Mobile Sidebar Controls
function initMobileControls() {
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebar = document.getElementById("overviewSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
    });

    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });
  }
}

window.closeMobileSidebar = function() {
  const sidebar = document.getElementById("overviewSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("active");
};

// Render Sidebar Navigation
function renderSidebarNav() {
  const navContainer = document.getElementById("sidebarNavList");
  if (!navContainer) return;

  navContainer.innerHTML = window.OVERVIEW_TABS.map(tab => {
    const isActive = tab.id === currentActiveTabIndex;
    return `
      <li class="sidebar-tab-item ${isActive ? 'active' : ''}" id="sidebarTabItem_${tab.id}">
        <button type="button" class="sidebar-tab-btn" onclick="window.switchTab(${tab.id})">
          <div class="tab-btn-content">
            <i class="${tab.icon} tab-btn-icon"></i>
            <span>${tab.title}</span>
          </div>
          <span class="tab-btn-badge">${tab.sections.length}</span>
        </button>
        <ul class="sidebar-subnav-list" id="sidebarSubnav_${tab.id}">
          ${tab.sections.map(sec => `
            <li>
              <a href="#${sec.id}" class="sidebar-subnav-link" onclick="window.closeMobileSidebar()">
                ${sec.num} ${sec.title}
              </a>
            </li>
          `).join("")}
        </ul>
      </li>
    `;
  }).join("");
}

// Switch SPA Tab
window.switchTab = function(tabId) {
  currentActiveTabIndex = tabId;
  const targetTab = window.OVERVIEW_TABS.find(t => t.id === tabId);
  if (!targetTab) return;

  // Update sidebar active states
  document.querySelectorAll(".sidebar-tab-item").forEach(item => item.classList.remove("active"));
  const activeItem = document.getElementById(`sidebarTabItem_${tabId}`);
  if (activeItem) activeItem.classList.add("active");

  window.closeMobileSidebar();
  renderTabContent(targetTab);

  // Log audit history
  logReadHistory(targetTab.title);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const tabComponentFiles = {
  1: "components/html_tabs/tab1_architecture.html",
  2: "components/html_tabs/tab2_frontend.html",
  3: "components/html_tabs/tab3_backend_api.html",
  4: "components/html_tabs/tab4_cloudinary_media.html",
  5: "components/html_tabs/tab5_database_schema.html",
  6: "components/html_tabs/tab6_security_vault.html",
  7: "components/html_tabs/tab7_ai_engine.html",
  8: "components/html_tabs/tab8_search_engine.html",
  9: "components/html_tabs/tab9_video_ecosystem.html",
  10: "components/html_tabs/tab10_contributor_rbac.html",
  11: "components/html_tabs/tab11_legal_compliance.html",
  12: "components/html_tabs/tab12_devops_cicd.html"
};

// Render Tab Content with Native Ads after Every 4 Sections
async function renderTabContent(tab) {
  const container = document.getElementById("tabContentContainer");
  if (!container) return;

  let sectionsHtml = "";
  let loadedFromComponent = false;

  const componentPath = tabComponentFiles[tab.id];
  if (componentPath) {
    try {
      const resp = await fetch(componentPath);
      if (resp.ok) {
        const rawHtml = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, "text/html");
        const sections = doc.querySelectorAll(".overview-section");
        if (sections.length > 0) {
          sections.forEach((secEl, idx) => {
            const secNum = idx + 1;
            sectionsHtml += secEl.outerHTML;
            if (secNum % 4 === 0) {
              sectionsHtml += generateNativeAdHtml(secNum);
            }
          });
          loadedFromComponent = true;
        }
      }
    } catch (e) {
      console.warn("Component fetch fallback for tab", tab.id, e);
    }
  }

  if (!loadedFromComponent) {
    tab.sections.forEach((sec, idx) => {
      const secNum = idx + 1;
      sectionsHtml += generateSectionHtml(tab, sec, secNum);

      // Insert Native Ad after every 4 sections
      if (secNum % 4 === 0) {
        sectionsHtml += generateNativeAdHtml(secNum);
      }
    });
  }

  container.innerHTML = `
    <!-- BREADCRUMBS -->
    <div class="breadcrumbs-bar">
      <a href="https://dpgnotes.web.app/index.html"><i class="ri-home-4-line"></i> Homepage</a>
      <i class="ri-arrow-right-s-line"></i>
      <a href="https://dpgnotes.web.app/dashboard.html">Contributor Dashboard</a>
      <i class="ri-arrow-right-s-line"></i>
      <span style="color:#ffffff;">Confidential Overview: Tab ${tab.id}</span>
    </div>

    <!-- TAB BANNER -->
    <div class="tab-banner-card">
      <div class="tab-banner-meta">
        <span class="tab-index-badge">Document Section ${tab.id} of 12</span>
        <span class="badge-clearance"><i class="ri-shield-keyhole-line"></i> Level-3 Confidential</span>
        <span class="tab-read-time"><i class="ri-time-line"></i> ${tab.readTime}</span>
      </div>
      <h1 class="tab-main-title">${tab.title}</h1>
      <p class="tab-main-desc">${tab.desc}</p>
    </div>

    <!-- QUICK SECTION PILLS -->
    <div class="section-pills-bar">
      ${tab.sections.map(s => `<a href="#${s.id}" class="section-pill-link">${s.num} ${s.title.substring(0, 24)}...</a>`).join("")}
    </div>

    <!-- SECTIONS -->
    ${sectionsHtml}

    <!-- TAB FOOTER NAVIGATION -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:3rem; padding-top:1.5rem; border-top:1px solid var(--border-subtle);">
      ${tab.id > 1 ? `
        <button type="button" class="header-home-btn" onclick="window.switchTab(${tab.id - 1})">
          <i class="ri-arrow-left-line"></i> Previous: Tab ${tab.id - 1}
        </button>
      ` : `<div></div>`}
      
      <a href="https://dpgnotes.web.app/dashboard.html" class="header-home-btn" style="background:rgba(99,102,241,0.12); color:#818cf8; border-color:rgba(99,102,241,0.3);">
        <i class="ri-dashboard-line"></i> Return to Contributor Dashboard
      </a>

      ${tab.id < 12 ? `
        <button type="button" class="header-home-btn" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#ffffff; border:none;" onclick="window.switchTab(${tab.id + 1})">
          Next: Tab ${tab.id + 1} <i class="ri-arrow-right-line"></i>
        </button>
      ` : `<div></div>`}
    </div>
  `;
}

// Generate Detailed Semantic Section HTML
function generateSectionHtml(tab, sec, secNum) {
  // Rich detailed academic / technical content tailored to the topic
  return `
    <article class="overview-section" id="${sec.id}">
      <div class="section-header-wrap">
        <h2 class="section-title">
          <span class="section-num">${sec.num}</span> ${sec.title}
        </h2>
        <span class="section-badge" style="background:rgba(99,102,241,0.15); color:#818cf8; border:1px solid rgba(99,102,241,0.3);">${sec.badge}</span>
      </div>
      <div class="section-body">
        <p>
          The <strong>${sec.title}</strong> module represents an integral pillar of DPGNotes architecture. Designed for enterprise stability and low latency, it guarantees uninterrupted academic access across university clusters.
        </p>
        
        <div class="callout-box">
          <div class="callout-title"><i class="ri-shield-check-line"></i> Architecture Specification & Invariant Guarantee</div>
          Under official DRASA regulations and Google Cloud / Firebase deployment parameters, every client request traversing this subsystem is verified against active cryptographic tokens and validated schema definitions.
        </div>

        <p>
          Key architectural components operational in this layer include:
        </p>
        <ul>
          <li><strong>Zero-Latency Pipeline:</strong> Optimized execution path minimizing round-trip latency across mobile, foldable, and desktop clients.</li>
          <li><strong>Fail-Safe Circuit Breaker:</strong> Automated fallback routines to maintain service continuity during upstream API outages.</li>
          <li><strong>Asynchronous Telemetry Dispatch:</strong> Non-blocking engagement tracking for views, likes, downloads, and interactive screentime.</li>
        </ul>

        <div class="code-block-wrap">
          <div class="code-header">
            <span><i class="ri-code-s-slash-line"></i> ${tab.slug}_subsystem_${sec.id}.config.json</span>
            <span>READ-ONLY • SECURED</span>
          </div>
          <pre class="code-block"><code>{
  "module": "${tab.slug}",
  "sectionId": "${sec.id}",
  "subsystem": "${sec.title}",
  "policy": "STRICT_CLEARANCE_REQUIRED",
  "endpoint": "https://dpgnotes.web.app/api/${tab.slug}/${sec.id}",
  "cacheTtlSeconds": 86400,
  "telemetryIngestion": true,
  "status": "HEALTHY_ACTIVE"
}</code></pre>
        </div>

        <table class="overview-data-table">
          <thead>
            <tr>
              <th>Subsystem Metric</th>
              <th>Operational Threshold</th>
              <th>Enforcement Mechanism</th>
              <th>Reference Link</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Availability SLA</td>
              <td>99.95% Continuous Uptime</td>
              <td>Automated Health Probes & Multi-Cloud Fallback</td>
              <td><a href="https://dpgnotes.web.app/legal/index.html">Legal SLA</a></td>
            </tr>
            <tr>
              <td>Access Authorization</td>
              <td>Verified Contributor + Admin Date Window</td>
              <td>Firestore <code>confidential_overview_requests</code> Rule</td>
              <td><a href="https://dpgnotes.web.app/dashboard.html">Contributor Portal</a></td>
            </tr>
            <tr>
              <td>Data Governance</td>
              <td>Zero Data Leakage / Full Encryption</td>
              <td>AES-256-GCM Vault & TLS 1.3 Transport</td>
              <td><a href="https://dpgnotes.web.app/legal/security-policy.html">Security Policy</a></td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top:1rem; font-size:0.85rem; color:var(--text-muted);">
          Reference Documentation: For additional administrative guidelines, explore the <a href="https://dpgnotes.web.app/Docs/index.html">Platform Documentation Hub</a> or consult the <a href="https://dpgnotes.web.app/legal/drasa-policy.html">DRASA Regulatory Manual</a>.
        </p>
      </div>
    </article>
  `;
}

// Generate Native Ad Matching PDF Viewer Ad Format
function generateNativeAdHtml(slotIndex) {
  const adTitles = [
    "Akshat Network Hub • Next-Gen Cloud & Academic Infrastructure",
    "Horizon TechX • Premier Internship & Software Training",
    "Codagenda • Transform Your Career with Real-World Projects",
    "DPGNotes Capstone Suite • Elevate Your Engineering Degree"
  ];
  const adDescs = [
    "Build state-of-the-art full-stack applications with verified mentorship and production-grade deployments.",
    "Explore hands-on software development programs with industry mentors and recognized certificates.",
    "Accelerate your computer science mastery with curated DSA roadmaps, system design, and mock interviews.",
    "Access certified study guides, sessional question papers, and high-DPI academic front cover generators."
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

// ============================================================================
// ACCESS CONTROL & GATEKEEPER IMPLEMENTATION
// ============================================================================
async function checkAuthAndClearanceGate() {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  const gateTitle = document.getElementById("gateTitle");
  const gateDesc = document.getElementById("gateDesc");
  const gateStatusBox = document.getElementById("gateStatusAlert");
  const gateForm = document.getElementById("gateRequestForm");

  // Wait for Auth
  onAuthStateChanged(auth, async (user) => {
    // Resolve active user (auth or localStorage fallback)
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
      // Unauthenticated
      if (gateOverlay) gateOverlay.style.display = "flex";
      if (gateTitle) gateTitle.textContent = "Verified Contributor Sign In Required";
      if (gateDesc) gateDesc.textContent = "The Confidential DPGNotes System Overview is restricted strictly to verified academic contributors with active administrator authorization.";
      if (gateStatusBox) {
        gateStatusBox.innerHTML = `
          <div style="color:#ef4444; font-weight:700; margin-bottom:4px;"><i class="ri-lock-line"></i> Authentication Barrier</div>
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
      // 1. Check direct doc by UID
      const docRef = doc(db, "confidential_overview_requests", currentActiveUser.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        clearanceDoc = { id: snap.id, ...snap.data() };
      } else {
        // Query by uid field
        const q = query(collection(db, "confidential_overview_requests"), where("uid", "==", currentActiveUser.uid));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          clearanceDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
        }
      }

      currentClearanceRecord = clearanceDoc;

      if (!clearanceDoc) {
        // No request submitted yet
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
      // If Firestore read fails due to rules or connectivity, render submission fallback
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
    // Scheduled for future
    if (gateOverlay) gateOverlay.style.display = "flex";
    if (gateTitle) gateTitle.textContent = "Clearance Window Scheduled";
    if (gateDesc) gateDesc.textContent = "Your confidential viewing authorization has been granted by the Administrator, but the validity window has not started yet.";
    if (gateStatusBox) {
      gateStatusBox.innerHTML = `
        <div style="color:#3b82f6; font-weight:700;"><i class="ri-time-line"></i> Scheduled Access Window</div>
        <p style="margin:4px 0;"><strong>Active From:</strong> ${record.startDate}</p>
        <p style="margin:4px 0;"><strong>Expires On:</strong> ${record.endDate}</p>
        <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Please return on or after the scheduled start date.</p>
      `;
    }
    if (gateForm) gateForm.style.display = "none";
    return;
  }

  if (end && now > end) {
    // Expired: Auto-denied!
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

  // VALID ACTIVE CLEARANCE!
  grantClearanceAccess(record);
}

function grantClearanceAccess(record) {
  const gateOverlay = document.getElementById("clearanceGateOverlay");
  if (gateOverlay) gateOverlay.style.display = "none";

  const userBadge = document.getElementById("headerClearanceBadge");
  if (userBadge) {
    userBadge.innerHTML = `<i class="ri-shield-check-fill" style="color:#10b981;"></i> Clearance Active (Thru ${record.endDate || 'Session'})`;
  }

  // Load Initial Tab
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
  if (gateDesc) gateDesc.textContent = "Submit a formal request to the System Administrator. Once approved with an assigned date threshold, full access to all 12 documentation tabs will unlock.";
  
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
        alert("Please provide your purpose for reviewing confidential architecture.");
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

    // Save with UID as doc id so each user has one active request record
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
      <p style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Once the Administrator authorizes your Start & End dates, refresh this page to begin.</p>
      <button type="button" class="header-home-btn" style="margin-top:10px; width:100%; justify-content:center;" onclick="window.location.reload()">
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
