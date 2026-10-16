# DPGNOTES LEGAL AND OPERATIONAL TRAINING COMPENDIUM
Version: 2.1.0
Last Update: July 17, 2026

## MODULE 1: COMPREHENSIVE LEGAL ARCHITECTURE & LEGAL CENTER OVERVIEW
DPGNotes operates as a centralized, high-speed educational resource repository dedicated to the academic success of students at DPG College. To safeguard the platform, maintain high standards of institutional compliance, and respect intellectual property rights, we have established a robust Legal Documentation framework. All users (including anonymous guest readers, registered contributors, and system administrators) are bound by the policies described herein. The Legal Center is situated at /legal/index.html and consists of eleven distinct compliance modules.

---

### MODULE 1.1: TERMS OF SERVICE & USER CONVENANTS
By accessing the DPGNotes portal, visitors agree to act in accordance with local university codes of conduct, federal copyright regulations, and general digital safety guidelines.
1. Access Conditions: Access to sessional and university papers is granted as an auxiliary academic aid.
2. Contributor Accounts: Academic contributors who upload resources must authenticate via Google Identity Provider. Contributors are solely responsible for ensuring the accuracy and intellectual rights of the materials they post.
3. Prohibited Usage: Users shall not engage in automated scraping, denial of service (DoS) attacks, profile counterfeiting, or the dissemination of malicious executable attachments masquerading as study materials.

---

### MODULE 1.2: PRIVACY POLICY & TELEMETRY PROTOCOLS
We are committed to absolute transparency regarding data collection. Our systems collect two levels of data:
1. Guest Telemetry (Anonymous Visitors):
   - Anonymous guest session tokens.
   - Exact timestamps of document views and downloads.
   - Resource search strings and filter criteria.
   - User-agent strings, browser versions, operating system tags, and display resolutions.
2. Contributor Telemetry (Authenticated Users):
   - Firebase Authentication UID, user-defined username, role tag, and email addresses.
   - Detailed audit logs including upload timestamps, like clicks, share link generations, and login histories.
   - Session duration statistics.
3. Security Monitoring: We monitor access patterns to identify credentials stuffing, bot registrations, and bulk document downloading. If suspicious telemetry is detected, the IP is flagged, and a security alert is dispatched to administrators.

---

### MODULE 1.3: COOKIE & CONSENT MANAGEMENT
DPGNotes uses essential cookies to track contributor authorization sessions and maintain UI configurations (such as dark mode preferences and active theme selections).
1. Session Cookies: Essential for account authorization. These are cleared upon logging out.
2. Local Storage: Used to cache theme choices (Classic Dark, Ocean Blue, Sunset Red, Forest Green) and admin JSON Web Tokens (JWT) for secure portal operations.
3. Third-Party Tracking: Google AdSense scripts use standard tracking cookies to deliver personalized advertising. Users can manage their ad personalization preferences through their Google Ad settings.

---

### MODULE 1.4: ACCURACY & ACADEMIC DISCLAIMER
All notes, sessional exam papers, event summaries, and placement guides shared on DPGNotes represent user contributions.
1. No Grade Warranties: DPGNotes does not guarantee that studying the resources hosted on the site will result in passing marks, specific grades, or professional placements.
2. Unverified Contributor Notes: While administrators screen submissions, personal lecture notes represent the uploader's understanding of the curriculum. Students are encouraged to cross-reference guides with official university textbooks.
3. Third-Party Links: External links embedded within shared reports or viewer interfaces are beyond DPGNotes' operational control. We do not warrant the safety or uptime of third-party domains.

---

### MODULE 1.5: COPYRIGHT & INTELLECTUAL PROPERTY COMPLIANCE
DPGNotes respects the intellectual property rights of academic authors, textbook publishers, universities, and independent creators.
1. Copyright Prohibitions: Contributors are explicitly forbidden from uploading scanned copies of copyrighted commercial textbooks, premium academic guides, or restricted university publications without express permission from the copyright owner.
2. Educational Fair Use: Sessional papers and university syllabus structures are shared strictly for non-profit, educational guidance under general Fair Use principles.
3. Automated Metadata Scanning: When a document is uploaded, it is automatically screened by the AI compliance manager to flag copyright terms, textbook titles, or author credits indicating intellectual property violations.

---

### MODULE 1.6: DIGITAL MILLENNIUM COPYRIGHT ACT (DMCA) PROCEDURES
In compliance with the DMCA, DPGNotes maintains a strict take-down notification procedure.
1. Notification Requirements: Copyright holders who identify infringing content must submit a formal take-down notice containing:
   - A physical or electronic signature of the copyright owner or authorized representative.
   - Precise identification of the copyrighted work claimed to be infringed.
   - The exact share code or document ID hosting the material.
   - Contact details (phone number, email address, physical address) of the complaining party.
   - A statement indicating that the copyright holder has a good faith belief that use of the material is unauthorized.
2. Processing Notice: Once a valid DMCA notice is received, administrators immediately remove the document from the Cloud Firestore database and Cloud Storage. The corresponding share link is terminated, and the uploader's account receives a formal compliance warning.

---

### MODULE 1.7: SECURITY VIOLATIONS & ACCOUNT BANNING
To protect DPGNotes from malicious activities, the system enforces a strict violation protocol:
1. Violation Logs: Any attempt to bypass upload validation, inject malicious code (XSS), scrape the directory, or counterfeit contributor profiles results in the generation of a record in the `security_violations` collection.
2. Automatic Alerts: The administrator is notified via immediate system alerts.
3. Suspension Protocol:
   - Minor Violations: Results in a temporary account suspension.
   - Reactivation Lock: If a contributor is suspended, they cannot be reactivated by administrators until at least 50% of the suspension duration has elapsed. The Reactivation button remains locked in the UI, enforcing compliance.
   - Major Violations: Results in a permanent ban and IP blocking.

---

### MODULE 1.8: DATABASE RETENTION & DATA PURGING
We keep user and document data only as long as necessary for academic usage:
1. Active Document Records: Maintained indefinitely until deleted by the contributor or removed due to a DMCA action.
2. Audit Logs: System logs and active session records are retained for a rolling period of 90 days, after which they are automatically purged.
3. Deleted Accounts: When a contributor requests account deletion, all personal profile info is immediately scrubbed from the database. Any shared documents are either reassigned to an anonymous placeholder or removed based on the user's preference.

---

## MODULE 2: SYSTEM OPERATIONAL GUIDELINES & ADMIN PROCEDURES
This module outlines how the platform handles administrative functions, including notification logs, duplicate user profile scanning, and sessional exam uploads.

---

### MODULE 2.1: SESSIONAL EXAM (SE) AND UNIVERSITY EXAM (UE) UPLOAD SCHEMAS
All academic uploads must follow a rigid validation schema to maintain database integrity.
1. Sessional Exams (SE): Must specify the college name (e.g., DPG College), semester, department (e.g., BCA, B.Tech CS), subject name, sessional number (Sessional 1, Sessional 2, Sessional 3), and year.
2. University Exams (UE): Must specify the university name (e.g., MDU), year of the exam, subject code, and course stream.
3. Required Schema Fields:
   - `category` (SE, SP, UE, EV, T&N, IQ, A&LR, PQ)
   - `discipline` (Academic course stream)
   - `title` (Short descriptive name)
   - `description` (Detailed document overview)
   - `tags` (Array of keywords)
   - `documentId` (Unique alphanumeric code)
   - `pdfUrl` (Secure Firebase storage link)
   - `userId` (Uploader UID)
   - `userName` (Uploader username)
   - `createdAt` (Timestamp)

---

### MODULE 2.2: NOTIFICATIONS LOGGING & DUPLICATE PROFILE DETECTION
DPGNotes runs automatic daemons to ensure user base integrity:
1. Automated Duplicate Scanning: On server startup, the backend runs `scanDuplicateProfiles()`. This script searches the database for duplicate user configurations, matching identical IP addresses or matching user profiles.
2. Admin Alert Rules: If a duplicate profile is detected:
   - An entry is logged in the `notifications` collection.
   - A single notification is sent.
   - An automated system mail is sent to the admin.
   - To prevent alert fatigue, duplicate notifications for the same user profile are suppressed once the admin or contributor marks the warning status as "Read".
3. System Notifications: All system emails are duplicated as entries in the Firestore `notifications` collection so that administrators can audit them centrally from the portal log.

---

### MODULE 2.3: SHARE LINKS TERMINATION AND REDIRECTIONS
1. Termination: If an uploader or administrator terminates a share link, the Firestore document in the `share_links` collection is updated with `status: "terminated"`.
2. Redirection: When a visitor attempts to access a terminated or invalid share URL, the backend routes redirect the request to the DPGNotes home page (`/index.html`) to prevent 404 errors.
3. System Alerts: A system alert and email are automatically sent to the creator of the link informing them of the compliance termination.

---

## MODULE 3: THE DPGNOTES AI ARCHITECTURE & INTEGRATION
DPGNotes integrates Gemini AI models to automate content moderation, compliance reports, and document analysis.

---

### MODULE 3.1: AI CONTENT SCREENING (COMPULSORY)
Before any document, profile update, or login request is processed, the data must pass the AI screening pipeline:
1. Document Screening: Evaluates titles, descriptions, and tags for copyright flags, PII, hate speech, or non-educational content. If the AI responds with `reject`, the upload is aborted, and a notification is logged.
2. Profile Screening: Filters profiles for profanity or malicious code inputs (XSS payloads).
3. Login Screening: Analyzes user-agent strings and IP addresses for bot registrations or suspicious credential stuffing.
4. Compliance Report Analysis: Compiles telemetry logs into a summary highlighting visitor traffic, bot anomalies, and compliance statuses.

---

### MODULE 3.2: CONVERSATIONAL CHAT MODE
The Chat mode runs locally on the client using the `/api/ai/chat` endpoint.
1. No DB Storage: Conversations are held in client-side arrays (`reportChatHistory`, `pdfChatHistory`, `legalChatHistory`) and persist strictly until refresh.
2. Context Mapping: Every request includes the user's question, the history array, and custom page context (e.g. document details, legal center sections, or report traffic statistics) to ensure highly accurate, context-aware responses.

---

## MODULE 4: FREQUENTLY ASKED QUESTIONS (FAQ) & PROTOCOLS
This module contains standard Q&A guidelines for the DPGNotes Legal Center.

Q1: What should I do if my document upload was rejected?
A: Check your notification log in the contributor dashboard. The AI Compliance manager logs a detailed reason for the rejection (e.g., copyright terms in the title, empty descriptions, or spam tags). Revise the metadata and try uploading again.

Q2: How are contributor suspensions handled?
A: Suspension durations depend on the severity of the violation. Admins can deactivate the suspension and reactivate the contributor account, but only after at least 50% of the suspension duration has been served. The Reactivate button is locked until then.

Q3: Are my download and search habits recorded?
A: We record anonymous telemetry (OS, browser, search terms) to improve speed and relevance. Individual identities are never linked to these logs unless you are logged into a contributor account.

Q4: How does the PDF Viewer protect copyright?
A: The PDF Viewer uses PDF.js to render documents on canvases, preventing direct raw file downloads. Dynamic AdSense banners are inserted after every 3 pages, and the AI screening runs automatically before the document is published.

---

## MODULE 5: ADVERTISING & EXTERNAL LINKS DISCLAIMER POLICIES
This module describes platform guidelines regarding Google AdSense integrations and link redirections.

---

### MODULE 5.1: ADVERTISING & SPONSORED ADS CONTENT SAFETY POLICY (Effective Date: August 10, 2026)
1. Scope & 5 Sponsored Ad Categories:
   - DPGNotes Resource Boost: PDF notes, PYQs, and study guides.
   - LinkedIn Post / Article Promotion: Engineering posts and tech articles.
   - Medium Story Promotion: Technical tutorials and project blogs.
   - GitHub Repository Promotion: Open-source repos, developer tools, and code bases.
   - YouTube Video / Channel Promotion: Video lectures, channel trailers, and software demos.
2. Contributor Submission Workflow: Category selection, title & description with AI Auto-Suggest Tags, media assets (Cloudinary/YouTube), operational destination link, and automated/admin verification.
3. Content Safety & Prohibited Content: No malware, phishing, hate speech, explicit media, academic dishonesty scams, or deceptive clickbait.
4. Violation Enforcement Matrix:
   - Minor (Level 1): Incorrect tags or broken links -> Ad rejection & revision notice.
   - Moderate (Level 2): Misleading title or domain spoofing -> Campaign deletion & 14-day ad upload block.
   - Severe (Level 3): Malware, piracy, or phishing -> Immediate permanent account suspension under DRASA policy.
5. AdSense Integration & Hiding: Google AdSense runs alongside Native Approved Ads. If AdSense fails to return an ad, empty slots collapse automatically. User chat records and credentials are never shared with ad networks.

---

### MODULE 5.2: EXTERNAL LINKS & REDIRECT WARNINGS
1. Safety Warnings: Whenever a user clicks an external link (non-DPGNotes hosts), a custom security warning popup is displayed.
2. Link Policies: Users can proceed at their own risk or return. The popup links to /legal/index.html#links-policy for policy details.
3. Referrer Protections: External URLs are opened using noopener, noreferrer headers to protect browser tab session keys from leakage.

---

### MODULE 5.3: NATIVE ADS MONETIZATION, SUBSIDY DEDUCTIONS & BILLING CYCLE FINALIZATION
1. Scope & Economics:
   - DPGNotes charges advertisers per genuine single engagement per calendar month (whichever happens first: hover or visit).
   - Standard Unit Rates: Contributor = ₹12 / hover, ₹20 / visit. Guest = ₹6 / hover, ₹10 / visit (50% concession).
   - Self-Interaction Prohibition: Advertisers / contributors clicking or hovering on their own uploaded ads are 100% non-billable and bypassed automatically.
2. Academic Portfolio Tier Concession:
   - Bronze Tier (≥3 Docs): 20% discount across all interaction charges.
   - Silver Tier (≥10 Docs + ≥5 Assignment Sols + ≥5 Practical Sols): 40% discount across all charges.
   - Gold Tier (≥25 Docs + ≥12 Assignment Sols + ≥12 Practical Sols): 60% discount across all charges.
   - Diamond Tier (≥75 Docs + ≥25 Assignment Sols + ≥25 Practical Sols): 80% discount across all charges.
   - Platinum Tier (≥120 Docs + ≥45 Assignment Sols + ≥45 Practical Sols): 100% Free / Fully Sponsored.
3. Placement Subsidy Deductions:
   - Advertisers earn a direct Subsidy Deduction off their bill when their ads appear on peer resources:
     - Eligible Placements: Another contributor's Assignment Solution, Practical Solution, PDF resource, or platform utility / legal note pages.
     - Ineligible Placements: Ads appearing on the contributor's own solutions or PDFs (or duplicate cluster accounts) do NOT earn subsidies.
     - Subsidy Unit Rates: ₹9 / hover (Contributor), ₹3 / hover (Guest); ₹12 / click (Contributor), ₹8 / click (Guest).
     - Deduction Formula: `Total Net Payable = MAX(0, Gross Charges - Tier Concession - Total Subsidy Saved)`.
     - Monthly Deduplication Limit: Max 1 valid subsidy engagement per unique user / guest per ad per month.
4. Monthly Billing Cycle Finalization on the 5th:
   - On the 5th day of every calendar month, the previous month's advertising cycle concludes and freezes permanently in the Firestore ledger (`ads_monetization_ledger`).
   - An automated, itemized email statement is dispatched to the advertiser detailing gross hovers/visits, tier discounts, subsidy deductions, and net payable dues.
   - Advertisers settle dues offline via verified UPI (9953854901@ybl) within the 15-day grace period. Study notes and academic uploads remain 100% untouched regardless of ad billing status.

---

### MODULE 5.4: AI PROFILE CHECK ALGORITHM, IDENTITY CLUSTERING & FRAUD PREVENTION
1. Multi-Attribute Clustering Engine:
   - An AI engine cross-references users to identify duplicate accounts belonging to the same individual based on:
     - Similar/variant emails (Gmail dot-trick removal, plus-addressing, typo variations)
     - Matching or high Dice-coefficient name similarity
     - Matching GitHub repository profile links
     - Matching LinkedIn vanity URLs
     - Settings bio details and contact tokens
2. Single-Entity Billing Treatment:
   - All accounts grouped within an identity cluster are treated as a single entity.
   - Only one interaction (hover or click) across the entire cluster per ad per month is valid for billing.
   - Alternate accounts in the same cluster visiting or hovering the same ad in that monthly cycle are rejected with ₹0 charge.
3. 12-Hour Gap Anomaly Protection & Flagging:
   - Interactions with less than a 12-hour gap on the same ad URL trigger an anomaly purge: all charging logs for that ad are deleted and the visitor identity is flagged for 15 days.

