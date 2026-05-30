# 🚀 DPGNotes

> Smart Educational Resource Platform powered by Firebase, PDF.js and Modern Web Technologies.

🌐 Live Website:
https://dpgnotes.web.app

📘 Smart PDF Viewer:
https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/

🖼️➡️📄 Image to PDF Converter:
https://dpgnotes.web.app/ImagetoPdfConverter.html

📄🛡️ PDF Metadata Analyzer
https://dpgnotes.web.app/PdfMetaAnalyzer.html

---

# 📖 About

DPGNotes is a modern educational platform designed for:

- University Notes
- Sessional Exams
- Sample Papers
- Placement Preparation
- Interview Questions
- Aptitude & Logical Reasoning
- Smart PDF Reading

The platform uses a responsive SPA architecture with Firebase backend integration and an optimized PDF Viewer experience.

---

# ✨ Features

## 📄 Smart PDF Viewer

- Progressive PDF Loading
- Book Reading Mode
- Mobile Responsive Rendering
- Download & Share Actions
- PDF Diagnosis Engine
- Cross-Domain PDF Support

---

## 📚 Educational Resources

### Categories

- SE → Sessional Exam
- SP → Sample Paper
- UE → University Exam
- EV → Events , Programs , Schedule
- T&N → Tutorial & Notes
- IQ → Interview Questions
- A&LR → Aptitude & Logical Reasoning
- PQ → Placement Question

---

## 🎓 Supported Disciplines

- Computer Science
- AI & ML
- Cyber Security
- Data Analytics
- Commerce
- Science
- Arts
- Full Stack Development
- Digital Marketing
- Law
- Placements
- And More...

---

# ⚡ Tech Stack

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- PDF.js

## Backend

- Firebase Hosting
- Firebase Firestore
- Firebase Authentication

---

# 📱 Responsive Design

DPGNotes is optimized for:

- Desktop
- Laptop
- Tablet
- Mobile Devices
- Small Screen Devices

---

# 🔐 Authentication

Users can sign in using:

- Google Authentication
- GitHub Authentication

---

# 📂 Project Structure
```bash
    DPGNotes/
    │
    ├── public/
    │   ├── index.html
    │   ├── style.css
    │   ├── script.js
    │   └── firebase.js
    │
    ├── firestore.rules
    ├── firestore.indexes.json
    ├── firebase.json
    ├── README.md
    └── LICENSE
```
---

# 🚀 Installation

## Clone Repository
```bash
    git clone https://github.com/YOUR_USERNAME/DPGNotes.git
```
## Open Project
```bash
    cd DPGNotes
```
## Install Firebase CLI
```bash
    npm install -g firebase-tools
```
## Login Firebase
```bash
    firebase login
```
## Start Local Server
```bash
    firebase serve
```
OR
```bash
    Live Server Port 5500
```
---

# ☁️ Deployment

## Deploy Project
```bash
    firebase deploy
```
---
```bash
# 🤝 Contribution
```
You can contribute:

- Notes
- PDFs
- UI Improvements
- Performance Optimization
- SEO Enhancements
- Placement Resources

## 🔐 Upload Resource Workflow

DPGNotes follows a secure dynamic upload workflow to maintain educational quality and authenticated contributions.

---

### 1️⃣ Sign In Required

Before uploading any resource, users must authenticate using:

- Google Sign In
- GitHub Sign In

Authentication activates protected SPA tabs and upload permissions.

---

### 2️⃣ Open Upload Tab

After successful login:

    Bottom Navigation
    → Upload

OR

    Shortcut Key:
    Alt + 5

---

### 3️⃣ Fill Resource Details

Users must provide:

#### 📂 Category

Examples:

- SE → Sessional Exam
- SP → Sample Paper
- UE → University Exam
- EV → Events , Programs , Schedule
- T&N → Tutorial & Notes
- IQ → Interview Questions
- A&LR → Aptitude & Logical Reasoning
- PQ → Placement Question

---

#### 🎓 Discipline

Examples:

- Computer Science
- AI & ML
- Cyber Security
- Commerce
- Science
- Law
- Digital Marketing

---

#### 📝 Document Title

Example:

    Operating System Notes Unit 1

Keep titles:
- Short
- Search Friendly
- SEO Optimized

---

#### 📄 Description

Add a meaningful description explaining:

- Semester
- Subject
- Topics Covered
- Difficulty Level
- Resource Type

Example:

    Complete Operating System notes
    covering process management,
    deadlocks and CPU scheduling.

---

#### 🏷️ Tags / Keywords

Add comma separated keywords.

Example:

    os, operating system,
    cpu scheduling,
    semester 4,
    notes

This improves:
- Search Ranking
- Internal Filtering
- SEO Visibility

---

#### 🆔 Document ID

Add a unique and readable ID.

Example:

    OS-NOTES-SEM4

---

#### 📘 PDF URL

Add a direct PDF URL.

Example:

    https://example.com/file.pdf

Supported:
- Firebase Hosting PDFs
- GitHub Hosted PDFs
- Public Direct PDF URLs

---

### 4️⃣ Upload Resource

Click:

    Upload Resource

The system automatically:

✅ Stores data in Firebase Firestore  
✅ Links PDF Viewer  
✅ Categorizes Resources  
✅ Activates Search Indexing  
✅ Generates Dynamic Resource Cards  

---

## 🧠 Dynamic Architecture

DPGNotes dynamically handles:

- Authentication
- Resource Rendering
- Search Filtering
- PDF Viewer Routing
- Responsive Layouts
- SPA Navigation
- Smart Resource Categorization

---

## 📱 Mobile First Upload UI

The upload interface is optimized for:

- Small Phones
- Tablets
- Desktop Screens
- Touch Devices
- Responsive Keyboards

Features include:

- Large Inputs
- Touch Friendly Buttons
- Scroll Optimized Forms
- Responsive Spacing
- SPA Navigation Experience

---

## ⚠️ Upload Rules

❌ No Spam Uploads  
❌ No Invalid PDF Links  
❌ No Duplicate Resources  
❌ No Misleading Titles  
❌ No Broken URLs  

✅ Educational Content Only  
✅ Clean Descriptions  
✅ Proper Categorization  
✅ Search Friendly Tags  

---

# 📋 Field Selection Rules

To maintain educational quality, SEO optimization and clean categorization, every upload field in DPGNotes follows validation and contribution rules.

---

## 📂 Category Selection Rules

Users must select the correct category based on the resource type.

### Allowed Categories

| Category | Meaning |
|---|---|
| SE | Sessional Exam |
| SP | Sample Paper |
| UE | University Exam |
| EV | Events , Schedule , Curriculum |
| T&N | Tutorial & Notes |
| IQ | Interview Questions |
| A&LR | Aptitude & Logical Reasoning |
| PQ | Placement Question |

### Rules

✅ Choose only relevant category  
✅ Match actual document content  
✅ Use T&N for notes/tutorials only  

❌ Do not misuse categories  
❌ Do not upload mixed irrelevant resources  

---

## 🎓 Discipline Selection Rules

Discipline should represent the primary educational field.

### Examples

- Computer Science
- AI & ML
- Cyber Security
- Commerce
- Science
- Law
- Data Analytics
- Full Stack Development

### Rules

✅ Select closest matching discipline  
✅ Maintain consistency  
✅ Use proper academic field names  

❌ Avoid random disciplines  
❌ Avoid unrelated classifications  

---

## 📝 Document Title Rules

Titles should be readable, searchable and SEO friendly.

### Good Example

    Operating System Notes Unit 1

### Bad Example

    FinalFinalLatestNotes123

### Rules

✅ Keep title meaningful  
✅ Mention subject/topic clearly  
✅ Use academic naming format  

❌ Avoid clickbait titles  
❌ Avoid excessive symbols  
❌ Avoid misleading titles  

---

## 📄 Description Rules

Description should explain the resource clearly.

### Include

- Subject
- Semester
- Covered Topics
- Resource Type

### Rules

✅ Use clear educational language  
✅ Keep descriptions informative  
✅ Improve discoverability  

❌ Avoid spam keywords  
❌ Avoid fake descriptions  
❌ Avoid unrelated information  

---

## 🏷️ Tags / Keywords Rules

Tags improve:

- SEO
- Internal Search
- Resource Filtering
- Discoverability

### Example

    operating system,
    os notes,
    semester 4,
    cpu scheduling

### Rules

✅ Use comma separated tags  
✅ Add topic related keywords  
✅ Use searchable academic terms  

❌ Avoid irrelevant tags  
❌ Avoid repeated keywords  
❌ Avoid misleading SEO spam  

---

## 🆔 Document ID Rules

Document ID helps identify resources easily.

### Good Example

    OS-NOTES-SEM4

### Rules

✅ Keep IDs short and readable  
✅ Use uppercase naming if possible  
✅ Maintain uniqueness  

❌ Avoid special characters spam  
❌ Avoid duplicate IDs  

---

## 📘 PDF URL Rules

Only direct public PDF links are allowed.

### Supported Sources

✅ Firebase Hosted PDFs  
✅ GitHub Hosted PDFs  
✅ Public Direct PDF URLs  

### Rules

✅ URL must directly open PDF  
✅ PDF should be publicly accessible  
✅ Use HTTPS links only  

❌ No private URLs  
❌ No expired links  
❌ No malicious downloads  
❌ No non-PDF content  

---

# ⚖️ Terms & Conditions

By uploading resources to DPGNotes, users agree to the following terms.

---

## 📚 Educational Use Only

All uploads must be educational and academic in nature.

Allowed:

✅ Notes  
✅ Tutorials  
✅ Question Papers  
✅ Placement Material  
✅ Interview Preparation Resources  

Not Allowed:

❌ Pirated Content  
❌ Copyright Violations  
❌ Adult Content  
❌ Harmful Material  
❌ Spam Uploads  

---

## 🔐 User Responsibility

Users are fully responsible for:

- Uploaded Content
- PDF Validity
- Copyright Ownership
- Resource Authenticity

DPGNotes only provides the platform infrastructure.

---

## 🚫 Restricted Activities

The following may lead to restriction or removal:

❌ Spam Uploading  
❌ Fake Resources  
❌ SEO Abuse  
❌ Malicious URLs  
❌ Repeated Duplicate Uploads  
❌ Misleading Titles or Tags  

---

## ⚡ Platform Rights

DPGNotes reserves the right to:

- Remove Harmful Content
- Restrict Suspicious Uploads
- Update Contribution Policies
- Improve Validation Systems

without prior notice.

---

## 🛡️ Security Notice

DPGNotes uses:

- Firebase Authentication
- Firestore Rules
- Hosting Security Policies
- Dynamic Validation Logic

to maintain platform integrity.

---

## ❤️ Community Guidelines

DPGNotes encourages:

✅ Collaborative Learning  
✅ Educational Sharing  
✅ High Quality Contributions  
✅ Respectful Participation  

The platform aims to build a clean and accessible academic ecosystem for students and learners.

---

## 🚀 Future Improvements

Planned Upload System Upgrades:

- Drag & Drop PDF Upload
- Auto PDF Metadata Extraction
- AI Generated Tags
- Resource Verification
- Duplicate Detection
- Admin Moderation Panel
- Upload Analytics

---

## ❤️ DPGNotes Contribution Philosophy

DPGNotes is designed to become a collaborative educational ecosystem where students can:

- Learn
- Share
- Practice
- Grow
- Prepare for Placements
- Access Quality Resources

through a modern, optimized and responsive web platform.

---

## 🌟 Monthly Featured Community Resources

DPGNotes highlights high-quality educational contributions from the community every month.  
Featured resources help contributors gain visibility, credibility and stronger educational impact.

---

| Title | Category | Discipline | Uploaded On | Uploaded By | Resource Link |
|---|---|---|---|---|---|
| DBMS Notes for BCA Students | T&N | Computer Science | 22 May 2026 | Aman Akshat | [View Resource](https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=https%3A%2F%2Fakshat-881236.github.io%2FLearningClub-Key-of-Success-Learning-Point%2FPdfLibrary%2FPdfFiles%2FDBMS_SQ.pdf&title=DBMS%20Notes%20for%20BCA%20Students&category=T%26N&discipline=Computer%20Science&uploader=Aman%20Akshat&docid=DSC-CG-002&description=Database%20Management%20System%20Notes%20for%20all%20BCA%20and%20Minor%20opted%20DBMS%20Students.&tags=Database%2C%20DBMS%2C%20SQL%2C%20Entity%2C%20ER%20-%20Model%2C%20Atomicity) |
| Minor Physical Education Notes | T&P | UG / PG Courses | 22 May 2026 | Akshat Prasad | [Open PDF](https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=https%3A%2F%2Fakshat-881236.github.io%2FDPGStudent-881238%2FPdfResources%2FMICPhysicalEducationSem-4UGPGNotes.pdf&title=Minor%20Physical%20Education%20Notes%20&category=T%26N&discipline=UG%20%2F%20PG%20Courses&uploader=Akshat%20Prasad&docid=MIC-PE-001&description=Health%20Education%20%2C%20First%20Aid%20%26%20Safety%20Measure%20Notes%20for%20All%20UG%20%2F%20PG%20Course%20Students.&tags=MIC%20%2C%20%20Physical%20Education%20%2C%20%20PE%20%2C%20%20Health%20Education%20%2C%20%20Safety%20Education%20%2C%20%20First%20Aid%20Kit) |
| Physical Education Sem-2 Practical File | T&P | Physical Education | 20 May 2026 | Aman Akshat | [Explore Resource](https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=https%3A%2F%2Fakshat-881236.github.io%2FLearningClub-Key-of-Success-Learning-Point%2FPdfLibrary%2FPdfFiles%2FPhysical%2520Education%2520Practical%2520File%2520Demo.pdf&title=Physical%20Education%20Sem-2%20Practical%20File&category=T%26N&discipline=Physical%20Education&uploader=Aman%20Akshat&docid=MIC-PE-001&description=Comprehensive%20Practical%20File%20of%20Physical%20Education%20covering%20all%20practical%20as%20per%20curriculum.&tags=PE%20Practical%20File%20%2C%20%20Physical%20Education%20%2C%20%20History%20of%20Physical%20Education%20%2C%20%20Somatotypes%20) |

---

## 🏆 Featured Resource Selection Criteria

| Criteria | Description |
|---|---|
| Educational Quality | Resource should provide meaningful academic value |
| SEO Friendly Title | Proper readable and searchable titles |
| Useful Tags | Relevant keywords and categorization |
| PDF Accessibility | Valid public PDF links |
| Community Engagement | Frequently viewed or helpful resources |
| Clean Documentation | Proper descriptions and formatting |

---

## 🚀 Contributor Benefits

| Benefit | Description |
|---|---|
| README Recognition | Featured directly in official repository |
| GitHub Visibility | Increased contributor exposure |
| Educational Impact | Help students and learners |
| Portfolio Value | Strong contribution showcase |
| SEO Backlinks | Better discoverability on search engines |
| Community Reputation | Recognition among contributors |

---

## 📢 Want Your Resource Featured?

Upload high-quality resources with:

✅ Proper Category  
✅ Correct Discipline  
✅ SEO Friendly Title  
✅ Clean Description  
✅ Valid PDF Link  
✅ Educational Relevance  

Outstanding resources may be added to the official DPGNotes README showcase every month.

---

# 🔍 SEO Optimization

DPGNotes includes:

- JSON-LD SEO
- Mobile First Design
- Semantic HTML
- Structured Metadata
- Search Friendly Architecture

---

# 🧠 PDF Diagnosis System

The Smart PDF Viewer can detect:

- Missing PDF URLs
- Invalid Redirects
- Broken PDF Links
- Firebase Hosting Issues
- CORS Restrictions

---

# 🛡️ Security

- Firebase Firestore Rules
- Authenticated Uploads
- Protected Database Writes
- Secure Hosting Architecture

---

# 📌 Future Plans

- Admin Dashboard
- AI Search Engine
- OCR PDF Analysis
- Offline Reading
- User Profiles
- Analytics Dashboard

---

# 👨‍💻 Developer

## Akshat Prasad

Focused on:

- Web Development
- Firebase Applications
- SEO Optimization
- Educational Platforms
- Smart PDF Systems

---

# 🌟 Support

If you like this project:

- ⭐ Star the Repository
- 🍴 Fork the Project
- 📢 Share with Students
- 🚀 Contribute Resources

---

# ❤️ DPGNotes

### Smart Learning • Smart Reading • Smart Resources
