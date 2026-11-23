/**
 * DPGNotes Site Navigation & SEO JSON-LD Engine (site-map-nav.js)
 * 
 * 100% Genuine Predefined Vault crawled directly from live DPGNotes Firestore:
 *   - Verified Contributors (Real Names, UIDs, Emails, Roles, Profile URLs)
 *   - PDF Educational Resources (Real Document IDs, Titles, Subjects, Categories, Tags)
 *   - Practical Lab Solutions (Real Practical IDs, Course/Subject Titles, Lab Manuals)
 *   - Assignment Solutions (Real Assignment IDs, Questions, Answers, Subject Codes)
 *   - Online Quizzes & Tests (Real Quiz IDs, Question Counts, Subject Codes, Tags)
 * 
 * Continuous Synchronization:
 *   - Syncs every 12 hours per device tracked via IndexedDB (dpg_sitemap_sync_db).
 *   - Primary live sync from Render 24*7 Crawler Service: https://dpgnotes.onrender.com/api/sitemap/live-catalog
 *   - Client-side fallback to Firebase Firestore SDK and Firestore REST API.
 */
(function() {
  'use strict';

  var SITEMAP_SCRIPT_ID = 'dpg-site-nav-jsonld';
  var DB_NAME = 'dpg_sitemap_sync_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'sitemap_meta';
  var SYNC_RECORD_KEY = 'sync_state';
  var SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 Hours
  var RENDER_CRAWLER_ENDPOINT = 'https://dpgnotes.onrender.com/api/sitemap/live-catalog';

  // ==========================================
  // 100% GENUINE FIRESTORE PREDEFINED VAULT
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
            "uid": "4J7v9TtBy7Y5dUzYrnfAkmsFbEL2",
            "name": "Akshat Prasad ANH",
            "email": "its.akshatnetworkhub23@gmail.com",
            "avatar": "https://lh3.googleusercontent.com/a/ACg8ocIhL3EZbvTD9ZpBGJvJaxFpYu2sYDemrL56kJKq7tjCufkt-R8=s96-c",
            "role": "Platform Administrator & Lead Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=4J7v9TtBy7Y5dUzYrnfAkmsFbEL2"
      },
      {
            "uid": "5bPws7Uxo8YbReDVmVdyDwWWpyw2",
            "name": "Aman Kashyap",
            "email": "its.aman3103@gmail.com",
            "avatar": "https://lh3.googleusercontent.com/a-/ALV-UjXvhvxp8jNPMIm05HM-KB9vbpV8eY3F7_NRpKQIM4okFECTGXGIEjAsd0eYjHJm1fvBGiC_vd7f0-wxtUmUZWdQhgT-xKT3S8eep8kXJpUFjgOFsg-xXxXhjb0__VL5lpyVbPppNbsrn2N_WI5f1ITgPb09ZRypZ7uU2ipTwEtCqjXVMhk_MMH2ts8DQfkUS9QPuOfgGvASpHxFqLQPFKyFYbDhlGDTFieDbvLF9itqW5yEpqwfSLkqLQ1-mrgKIELSXQf7jMy5beMRkWR__Jd9matuFmc0VtePrZPOhavQrmEvQWXb6OIBuFOVKEugZN6QaXdLuVVMlvt4irG5mN9S7p5r-K5YzgPPakMPQxMIWgEqIDtyvwwkYiGKPMBpLDY1I7gFQIhFSgiulbBLbfbPO3O28uF3tu51Dv_cpULKr7w6hs3j6P0oc51prszm5sVhQcY-AOmxl8qHNBqOi2ARjWW5mUiObm8-7oDOkhRHUXqcbgdkCKZ704a2PAx2XmCFi1ALeSueF97hsoZOBAx-BVP4Z8l8_K8WuAarWOOuKvi0a2NW2svtt43oBeowfY-4Y37EMtlm5dQv2jGQrQGwRanC8d7Xfmi82M4SWP_wqYre9UfldiX95hgPoSn7QrUaNgzLmr78tndMRdTSSo3ZCliryDw0jmZ9e6sxyFEPKOCsiE2tNlpK_3U0XewzEbpiY_oOEcI9T9_6uCJT4biQEYKKcQVBkmp-9Lk9B1xuhHgca7Z3RmPqA51EjoGlE5RSXYpx5p8BxUwWXm2gZ2Iykipu5GvVdd3NLYDDm00gfoKJperasS8mwGRlrm35Y0vyNiIBUzEpyQLjnEK2uBkfQUiU3iwfAiDSDI0VVaHVApxUepMzUegBDYDKdAWh6XC13MHE7ISetCPJI-8qr_wnLlu_VANoPmFEV0RnJmTT_3z-D_gy3KOE9UPbw4b6DUKwIR05GblbPPlRNz9s81dHFrKyUfqnIPrBjosD55GOPrAeeEaDL8gBrtt9HiKWOh2N4XxF4qa9ZLbsDeMY0E8xSUXYxwZPaz61An1I78s1lIZaSUlkTR4=s96-c",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=5bPws7Uxo8YbReDVmVdyDwWWpyw2"
      },
      {
            "uid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "name": "Akshat Prasad",
            "email": "akshatpsd2005@gmail.com",
            "avatar": "https://lh3.googleusercontent.com/a/ACg8ocKLL4HTcMLN-bu19N4MdzQQ_uZhQ3FfHqb_LJW5JsEWVYmMPmE=s96-c",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=CCoQSLFfzWf4NGF6zox3tO399Xg1"
      },
      {
            "uid": "DggW7hMjO6faVHTFljrbypkhXb72",
            "name": "Sidhu",
            "email": "sidhu20th2nd@gmail.com",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=DggW7hMjO6faVHTFljrbypkhXb72"
      },
      {
            "uid": "EvZ43aHMkKMzhdnXFsL7y0H857h1",
            "name": "Pranav Shukla",
            "email": "shuklapranav672@gmail.com",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=EvZ43aHMkKMzhdnXFsL7y0H857h1"
      },
      {
            "uid": "N7D544J5IdYane7huazhZmjOOKu1",
            "name": "Aman Akshat",
            "email": "akshatpsd23@gmail.com",
            "avatar": "https://lh3.googleusercontent.com/a/ACg8ocIu8ZEHTKqN8vBZHNTMxLpVKFvX0sq9jSlhYiQ1PpHFwG_2mQ=s96-c",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=N7D544J5IdYane7huazhZmjOOKu1"
      },
      {
            "uid": "hbN0oauBgAN4IW4JqRG6HZuSR8w1",
            "name": "Kedir Ebrahim jemal",
            "email": "kbinebrahim@gmail.com",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=hbN0oauBgAN4IW4JqRG6HZuSR8w1"
      },
      {
            "uid": "iGY9tuTeFeRMn4w2sQDo2aXcVrH2",
            "name": "Verified Contributor",
            "email": "",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=iGY9tuTeFeRMn4w2sQDo2aXcVrH2"
      },
      {
            "uid": "its.akshatnetworkhub23@gmail.com",
            "name": "Verified Contributor",
            "email": "",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=its.akshatnetworkhub23@gmail.com"
      },
      {
            "uid": "o4jd5inPMLPyU2G3P8f22tiN1i02",
            "name": "techno pro",
            "email": "techno.procode01@gmail.com",
            "avatar": "https://lh3.googleusercontent.com/a/ACg8ocLpynX81EuNNdn4l6X2rom4TIeg8WgpNklYfXf6omUFP0FXIlg=s96-c",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=o4jd5inPMLPyU2G3P8f22tiN1i02"
      },
      {
            "uid": "rcq4EFbhbKRWdl9rMXOKe2KaMmt1",
            "name": "Sanjay Prasad",
            "email": "sanjaypsd13@gmail.com",
            "avatar": "",
            "role": "Verified Contributor",
            "profileUrl": "https://dpgnotes.web.app/profile.html?uid=rcq4EFbhbKRWdl9rMXOKe2KaMmt1"
      }
],
    pdfResources: [
      {
            "id": "MIC-PE-001",
            "title": "Minor Physical Education Notes",
            "subject": "UG / PG Course",
            "category": "T&N",
            "description": "Health Education , First Aid & Safety Measure Notes for All UG / PG Course Students.",
            "tags": "MIC, Physical Education, PE, Health Education, Safety Education, First Aid Kit",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=MIC-PE-001"
      },
      {
            "id": "122250",
            "title": "COA 2026 May Exam Question Paper",
            "subject": "Computer Science",
            "category": "UE",
            "description": "This is COA MDU Sem - 4 May - 2026 Examination Question Paper that help juniors prepare for same in advance.",
            "tags": "COA, COA Unit - 1, Computer Architecture Notes, CSA PYQ, Previous Year COA Paper",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=122250"
      },
      {
            "id": "DOC-T&N-001",
            "title": "Physiographic Division of India",
            "subject": "Geography",
            "category": "T&N",
            "description": "In this blog , explore Physiographic Division of India .",
            "tags": "Physiographic Division ,  Geo ,  Geography of India",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-001"
      },
      {
            "id": "162817",
            "title": "Physical Education Sem - 4",
            "subject": "UG / PG Courses",
            "category": "SP",
            "description": "Sample Paper of Physical Education Semester - 4.",
            "tags": "MIC, Physical Education, PE, Health Education, Safety Education, First Aid Kit",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=162817"
      },
      {
            "id": "CG-N-001",
            "title": "Computer Graphics ",
            "subject": "Computer Science",
            "category": "SP",
            "description": "5 Sample Paper of Computer Graphics",
            "tags": "CG, Raster Scan, Vector Scan, Sutherland, Polygons, Computer Graphics",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=CG-N-001"
      },
      {
            "id": "DSC-CG-003",
            "title": "Java Complete Notes",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Complete Java Exam Solutions With Diagrams And Code covering detail Q/A. It is prepared by Akshat Prasad.",
            "tags": "Java, Java Notes, JDK, Swing, AWT, Array, Applet",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DSC-CG-003"
      },
      {
            "id": "100137",
            "title": "Computer Department Paper",
            "subject": "Entrance Exam",
            "category": "EV",
            "description": "Entrance Exam Booklet of MDU Paper.",
            "tags": "Entrance Exam, Computer Science, MCA, BCA",
            "uploader": "Aman Kashyap",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=100137"
      },
      {
            "id": "MIC-PE-001",
            "title": "Physical Education Sem-2 Practical File",
            "subject": "Physical Education",
            "category": "T&N",
            "description": "Comprehensive Practical File of Physical Education covering all practical as per curriculum.",
            "tags": "PE Practical File ,  Physical Education ,  History of Physical Education ,  Somatotypes ",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=MIC-PE-001"
      },
      {
            "id": "1791542882566",
            "title": "Software Engineering Unit - 1 Important Question Answer",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Important Question Answer of Unit - 1 of Software Engineering (25BCA405DS01)",
            "tags": "Software Engineering, Software Crisis, Software Development Process, Waterfall, Prototype, Iterative Enhancement, Time Boxing, Spiral, Rapid Application Development, Object-Oriented Models, Software Project Management, Software Project Scheduling",
            "uploader": "techno pro",
            "uploaderEmail": "techno.procode01@gmail.com",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=1791542882566"
      },
      {
            "id": "DOC-T&N-009",
            "title": "Git / Github Commands",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Master your version control with these essential commands of Git / Github.",
            "tags": "Git, Github, git clone",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-009"
      },
      {
            "id": "ITR-001",
            "title": "VMS Internship Report",
            "subject": "Computer Science",
            "category": "EV",
            "description": "This is a Project Report below print based on my Summer Internship.",
            "tags": "VMS, Internship, Report, Project",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=ITR-001"
      },
      {
            "id": "97751",
            "title": "MFCS Sem - 1",
            "subject": "Computer Science",
            "category": "UE",
            "description": "PYQP of Mathematical Foundation of Computer Science for BCA Sem - 1 Student . ",
            "tags": "MFCS ,  Maths ,  Sets ,  Trignometry ,  Calculus ,  Mathematics ,  Matrix ",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=97751"
      },
      {
            "id": "DSC-CG-001",
            "title": "Computer Graphic Practical File",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "The Practical File of Computer Graphics design with all 15 programs prescribe by MDU, Rohtak.",
            "tags": "CG ,  CG Practical File ,  Lab Manual of CG ,  Computer Graphics File ",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DSC-CG-001"
      },
      {
            "id": "97752",
            "title": "Computer Fundamental & Problem Solving using C",
            "subject": "Computer Science",
            "category": "UE",
            "description": "This is the PYQP , downloaded from mystudy.com and upload here for quick access.",
            "tags": "C Programming ,  Basics of Computer ,  Computer Fundamental Semester - 1",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=97752"
      },
      {
            "id": "SAM/JAVA/001",
            "title": "Java Programming Sample Paper",
            "subject": "Computer Science",
            "category": "SP",
            "description": "8 Sample Paper of Java Programming Covering whole Syllabus.",
            "tags": "Java, JVM, JRE, Sample Paper",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "akshatpsd2005@gmail.com",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=SAM%2FJAVA%2F001"
      },
      {
            "id": "42003",
            "title": "Computer Architecture Sem - 1",
            "subject": "Computer Science",
            "category": "UE",
            "description": "This is the PYQP of Computer Architecture of BCA Sem - 1 Student from mdustudy.com",
            "tags": "CSA ,  COA ,  Computer System Architecture ,  DLD ,  Digital Electronics ,  CSA",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=42003"
      },
      {
            "id": "KOS/NOV/2427/0639001",
            "title": "Placement Readiness Program – Complete Schedule & Self-Evaluation Scheme (2026–2027)",
            "subject": "Career Development & Employability Skills",
            "category": "EV",
            "description": "This document presents the complete schedule and self-evaluation scheme for the Placement Readiness Program organized by KEY OF SUCCESS. Designed for Bachelor of Computer Application (BCA) students, the program covers technical training, practical learning, assessments, project development, communication skills, hackathon participation and mock interview preparation.\n\nThe schedule includes learning sessions on Figma, HTML, CSS, JavaScript, ReactJS, NextJS, Java, DSA, MySQL, MongoDB, Supabase and Python, followed by graded assessments and full-stack project development activities.\n\nThe program also emphasizes aptitude preparation, presentation skills, professional development, corporate readiness and AI-assisted mock interviews. The schedule runs from November 2026 to June 2027.",
            "tags": "Placement Readiness, Career Development, BCA, Technical Training, Web Development, JavaScript, ReactJS, NextJS, Java Programming, Data Structures and Algorithms, Python, Database Management, MySQL, MongoDB, Supabase, Full Stack Development, Aptitude Preparation, Mock Interview, Hackathon, Soft Skills, Employability Skills, Self Evaluation",
            "uploader": "Aman Kashyap",
            "uploaderEmail": "its.aman3103@gmail.com",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=KOS%2FNOV%2F2427%2F0639001"
      },
      {
            "id": "AIES-A2-Q1Q4@2026#HN",
            "title": "AI and Expert System Assignment 2 Solutions",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "These handwritten notes provide concise, structured solutions for four Artificial Intelligence and Expert System assignment questions. They cover Expert System architecture with a computer troubleshooting example, the 8-stage Expert System Development Life Cycle and knowledge acquisition techniques, Artificial Neural Networks (Perceptron structure and applications), and Fuzzy Logic versus Boolean Logic.",
            "tags": "Artificial Intelligence, Expert Systems, Expert System Architecture, Knowledge Base, Inference Engine, Expert System Development Life Cycle, Knowledge Acquisition, Artificial Neural Networks, Perceptron, Fuzzy Logic, Boolean Logic, Membership Function, AI Assignment Solutions, Handwritten Notes",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "akshatpsd2005@gmail.com",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=AIES-A2-Q1Q4%402026%23HN"
      },
      {
            "id": "DOC-T&N-005",
            "title": "Java Important Question Answer ",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Comprehensive list of 50+ Compulsory 1 / 2 Marks Question Answer of Java Programming.",
            "tags": "Java, AWT, Java Exam Question, Array, String Buffer",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-005"
      },
      {
            "id": "97770",
            "title": "Computer Graphics Paper",
            "subject": "Computer Science",
            "category": "UE",
            "description": "Previous Year QP of Computer Graphics, May-2026.",
            "tags": "CG, Raster Scan, Vector Scan, Sutherland, Polygons, Computer Graphics",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=97770"
      },
      {
            "id": "34365",
            "title": "Physical Fitness & Sport Training",
            "subject": "UG / PG Courses",
            "category": "UE",
            "description": "Previous Year Paper of MIC Physical Education 2nd Semester.",
            "tags": "MIC, PE, Posture, Fitness",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=34365"
      },
      {
            "id": "SE-26275-A2",
            "title": "Software Engineering Assignment - 2",
            "subject": "Computer Science",
            "category": "EV",
            "description": "Assignment - 2 of Software Engineering having 4 Question covering the concept of coupling and cohesion in software design, software testing and its  importance in software life cycle, Software Maintenance and Software Quality Assurance.",
            "tags": "coupling and cohesion, coupling, cohesion, software design, software testing, SDLC, Software Maintenance, Software Quality Assurance",
            "uploader": "Aman Akshat",
            "uploaderEmail": "akshatpsd23@gmail.com",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=SE-26275-A2"
      },
      {
            "id": "ITR-002",
            "title": "VMS Project Report",
            "subject": "Internship Report",
            "category": "EV",
            "description": "Complete documentation covering system design, tools and technologies, code structure, database, implementation, features, testing, deployment, and project workflow. Useful for BCA/B.Tech students, project viva, and academic reference.",
            "tags": "VMS, Internship, Project",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=ITR-002"
      },
      {
            "id": "DSC-CG-002",
            "title": "DBMS Notes for BCA Students",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Database Management System Notes for all BCA and Minor opted DBMS Students.",
            "tags": "Database, DBMS, SQL, Entity, ER - Model, Atomicity",
            "uploader": "Aman Akshat",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DSC-CG-002"
      },
      {
            "id": "SEO-CH-001",
            "title": "Search Engine Optimization Chapter - 1",
            "subject": "Digital Marketing & SEO",
            "category": "T&N",
            "description": "Chapter 1 of SEO Tutorial with brief introduction of Search Engine and SEO.",
            "tags": "SEO ,  Google ,  Ranking ,  SEO Chapter - 1 Introduction to SEO",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=SEO-CH-001"
      },
      {
            "id": "DOC-T&N-007",
            "title": "Operating System Notes",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Detail Notes of Process Management and Scheduling. ",
            "tags": "OS, Operating System, Process Management, Scheduling",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-007"
      },
      {
            "id": "101628",
            "title": "Data Communication Previous Year Paper",
            "subject": "Computer Science",
            "category": "UE",
            "description": "Data Communication Previous Year Paper - 2026 May Examination BCA 4th Semester.",
            "tags": "DCCN, DCN PYP, PYQ, MDU Exams Data Communication Paper",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=101628"
      },
      {
            "id": "DOC-T&N-004",
            "title": "COA Unit - 1 Notes",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Detail Question / Answer generated by ChatGPT in Research Mode on COA Unit - 1.",
            "tags": "COA, COA Unit - 1, Computer Architecture Notes, CSA",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-004"
      },
      {
            "id": "DOC-T&N-006",
            "title": "Operating System Notes",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Detail Notes of Operating System Chapter 1 Intro to OS.",
            "tags": "OS, Operating System, Introduction to OS",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=DOC-T%26N-006"
      },
      {
            "id": "171353",
            "title": "Java Previous Year Paper",
            "subject": "Computer Science",
            "category": "UE",
            "description": "Previous Year Paper of Java Programming BCA 4th Semester, May - 2026.",
            "tags": "Java Notes, PYQ Java, Java MDU Paper, Java Exam",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=171353"
      },
      {
            "id": "MIC/001",
            "title": "Teaching Method in Physical Education",
            "subject": "UG / PG Courses",
            "category": "T&N",
            "description": "Unit 1 Notes of Physical Education Semester 4 MIC.",
            "tags": "PE, Physical, Teaching Method",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=MIC%2F001"
      },
      {
            "id": "SE-U1-CH-01",
            "title": "Software Engineering CH - 1 Notes",
            "subject": "Computer Science",
            "category": "T&N",
            "description": "Easy Notes of Chapter 1 of Software Engineering for BCA Students.",
            "tags": "SE, Software, Software Engineering",
            "uploader": "Akshat Prasad",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=SE-U1-CH-01"
      },
      {
            "id": "172601",
            "title": "Physical Education Sem - 4",
            "subject": "UG / PG Courses",
            "category": "SP",
            "description": "Sample Paper of Physical Education Semester - 4.",
            "tags": "MIC, Physical Education, PE, Health Education, Safety Education, First Aid Kit",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=172601"
      },
      {
            "id": "24CSE001",
            "title": "SEO with AI Course",
            "subject": "Digital Marketing & SEO",
            "category": "EV",
            "description": "A complete self pace learning module for Advance SEO with AI Course.",
            "tags": "SEO Course, Google, Ranking, SEO with AI",
            "uploader": "Akshat Prasad ANH",
            "uploaderEmail": "",
            "url": "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=24CSE001"
      }
],
    practicalSolutions: [
      {
            "id": "prac_1789463865870_60m2k",
            "title": "Web Application Development BCA-5th Sem (BCA-5A)",
            "subject": "Web Application Development BCA-5th Sem",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified practical lab experiments, algorithms, and source code for Web Application Development BCA-5th Sem.",
            "tags": "25BCA405DS04, BCA-5A",
            "url": "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_1789463865870_60m2k"
      },
      {
            "id": "prac_1793269008491_c9w9d",
            "title": "Web Development – 1 (BCA-5A)",
            "subject": "Web Development – 1",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified practical lab experiments, algorithms, and source code for Web Development – 1.",
            "tags": "WD/001, BCA-5A",
            "url": "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_1793269008491_c9w9d"
      },
      {
            "id": "prac_1795020824041_bq1os",
            "title": "Web Application Development Practical File Lab Manual (BCA-5A)",
            "subject": "Web Application Development Practical File Lab Manual",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified practical lab experiments, algorithms, and source code for Web Application Development Practical File Lab Manual.",
            "tags": "26BCA403DS04, BCA-5A",
            "url": "https://dpgnotes.web.app/PracticalSolution/index.html?id=prac_1795020824041_bq1os"
      }
],
    assignmentSolutions: [
      {
            "id": "assign_1791803942790_i5lba",
            "title": "Cloud Computing Unit - 1 Important Question Answer (BCA-5A)",
            "subject": "Cloud Computing Unit - 1 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "4J7v9TtBy7Y5dUzYrnfAkmsFbEL2",
            "contributorName": "Akshat Prasad ANH",
            "contributorEmail": "its.akshatnetworkhub23@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Cloud Computing Unit - 1 Important Question Answer.",
            "tags": "25BCA405DS03, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791803942790_i5lba"
      },
      {
            "id": "assign_1791808286038_a5u5a",
            "title": "Cloud Computing Unit - 2 Important Question Answer (BCA-5A)",
            "subject": "Cloud Computing Unit - 2 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "4J7v9TtBy7Y5dUzYrnfAkmsFbEL2",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "its.akshatnetworkhub23@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Cloud Computing Unit - 2 Important Question Answer.",
            "tags": "25BCA405DS03, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791808286038_a5u5a"
      },
      {
            "id": "assign_1792065547116_4elrw",
            "title": "Cloud Computing Most Important Question Answer - 1 (BCA-5A)",
            "subject": "Cloud Computing Most Important Question Answer - 1",
            "course": "BCA-5A",
            "contributorUid": "4J7v9TtBy7Y5dUzYrnfAkmsFbEL2",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "its.akshatnetworkhub23@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Cloud Computing Most Important Question Answer - 1.",
            "tags": "25BCA405DS03, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1792065547116_4elrw"
      },
      {
            "id": "assign_1789287661498_pa0ad",
            "title": "Web Application Development BCA-5th Sem Assignment 1 (BCA-5A)",
            "subject": "Web Application Development BCA-5th Sem Assignment 1",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Web Application Development BCA-5th Sem Assignment 1.",
            "tags": "25BCA405DS04, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1789287661498_pa0ad"
      },
      {
            "id": "assign_1789373841400_vr5y6",
            "title": "Web Application Development BCA-5th Sem Assignment 2 (BCA-5A)",
            "subject": "Web Application Development BCA-5th Sem Assignment 2",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Web Application Development BCA-5th Sem Assignment 2.",
            "tags": "25BCA405DS04, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1789373841400_vr5y6"
      },
      {
            "id": "assign_1790345182233_s6sk7",
            "title": "Physical Education Unit–I: Introduction to Teaching Methods (BCA-5A)",
            "subject": "Physical Education Unit–I: Introduction to Teaching Methods",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Physical Education Unit–I: Introduction to Teaching Methods.",
            "tags": "26PED405MV01, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1790345182233_s6sk7"
      },
      {
            "id": "assign_1790759997745_3hapn",
            "title": "Methods of Teaching in Physical Education Assignment 1 and 2 (BCA-5A)",
            "subject": "Methods of Teaching in Physical Education Assignment 1 and 2",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Methods of Teaching in Physical Education Assignment 1 and 2.",
            "tags": "26PED405MV01, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1790759997745_3hapn"
      },
      {
            "id": "assign_1791542137800_em7vo",
            "title": "Software Engineering Unit - 1 Important Question Answer (BCA-5A)",
            "subject": "Software Engineering Unit - 1 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Software Engineering Unit - 1 Important Question Answer.",
            "tags": "25BCA405DS01, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791542137800_em7vo"
      },
      {
            "id": "assign_1791542882566_bjrx5",
            "title": "Software Engineering Unit - 2 Important Question Answer (BCA-5A)",
            "subject": "Software Engineering Unit - 2 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Software Engineering Unit - 2 Important Question Answer.",
            "tags": "25BCA405DS01, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791542882566_bjrx5"
      },
      {
            "id": "assign_1791543990965_e215u",
            "title": "Artificial Intelligence & Expert System Unit - 1 Important Question Answer (BCA-5A)",
            "subject": "Artificial Intelligence & Expert System Unit - 1 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Artificial Intelligence & Expert System Unit - 1 Important Question Answer.",
            "tags": "24BCA405DS02, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791543990965_e215u"
      },
      {
            "id": "assign_1791544857938_pclhv",
            "title": "Artificial Intelligence & Expert System Unit - 2 Important Question Answer (BCA-5A)",
            "subject": "Artificial Intelligence & Expert System Unit - 2 Important Question Answer",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Artificial Intelligence & Expert System Unit - 2 Important Question Answer.",
            "tags": "24BCA405DS02, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791544857938_pclhv"
      },
      {
            "id": "assign_1791976014341_kqrym",
            "title": "Top 20 React Interview Question Answer (BCA-5A)",
            "subject": "Top 20 React Interview Question Answer",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Top 20 React Interview Question Answer.",
            "tags": "PLA/JSX/001, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1791976014341_kqrym"
      },
      {
            "id": "assign_1792953944671_pn7ve",
            "title": "Recreation & Organization of Sports (BCA-1A)",
            "subject": "Recreation & Organization of Sports",
            "course": "BCA-1A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Recreation & Organization of Sports.",
            "tags": "24PED401MI01, BCA-1A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1792953944671_pn7ve"
      },
      {
            "id": "assign_1793885514504_8vnkw",
            "title": "Software Engineering – Assignment 2 Solution (BCA-5A)",
            "subject": "Software Engineering – Assignment 2 Solution",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Software Engineering – Assignment 2 Solution.",
            "tags": "25BCA405DS01, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1793885514504_8vnkw"
      },
      {
            "id": "assign_1794584697252_tfiw0",
            "title": "Web Application Development Assignment Assignment – 3 & 4 (BCA-5A)",
            "subject": "Web Application Development Assignment Assignment – 3 & 4",
            "course": "BCA-5A",
            "contributorUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd2005@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Web Application Development Assignment Assignment – 3 & 4.",
            "tags": "26BCA403DS04, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1794584697252_tfiw0"
      },
      {
            "id": "assign_1794721052637_c5p33",
            "title": "Cloud Computing Assignment 2 Solutions (BCA-5A)",
            "subject": "Cloud Computing Assignment 2 Solutions",
            "course": "BCA-5A",
            "contributorUid": "N7D544J5IdYane7huazhZmjOOKu1",
            "contributorName": "Akshat Prasad",
            "contributorEmail": "akshatpsd23@gmail.com",
            "description": "Verified academic assignment solution with questions and step-by-step answers for Cloud Computing Assignment 2 Solutions.",
            "tags": "25BCA405DS03, BCA-5A",
            "url": "https://dpgnotes.web.app/AssignmentSolution/index.html?id=assign_1794721052637_c5p33"
      }
],
    quizzes: [
      {
            "id": "qz_mvexqvjv_vvj5d",
            "title": "Mock NPTEL - Java Programming Quiz",
            "subject": "24BCA404DS03",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 10,
            "description": "Prepare for the NPTEL Programming in Java examination with challenging, concept-focused MCQs covering all major course topics. Test your understanding of the Java environment, OOP, encapsulation, inheritance, information hiding, scope rules, packages, interfaces, exception handling, multithreading, I/O streams, applets, AWT, Swing, networking, and JDBC. Each question has four plausible options and exactly one correct answer. Designed for exam revision, conceptual clarity, and identifying commonly confused Java concepts.",
            "tags": [
                  "Java",
                  "Java Programming",
                  "NPTEL",
                  "NPTEL Exam",
                  "OOP",
                  "Encapsulation",
                  "Inheritance",
                  "Interfaces",
                  "Packages",
                  "Exception Handling",
                  "Multithreading",
                  "Java I/O",
                  "Applets",
                  "AWT",
                  "Swing",
                  "Networking",
                  "JDBC",
                  "Computer Science",
                  "MCQ",
                  "Exam Preparation"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvexqvjv_vvj5d"
      },
      {
            "id": "qz_mvf1v9sf_pahns",
            "title": "NPTEL Java Programming - Mock Test",
            "subject": "24BCA404DS03",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 20,
            "description": "Prepare for the NPTEL Programming in Java examination with challenging, concept-focused MCQs covering all major course topics. Test your understanding of the Java environment, OOP, encapsulation, inheritance, information hiding, scope rules, packages, interfaces, exception handling, multithreading, I/O streams, applets, AWT, Swing, networking, and JDBC. Each question has four plausible options and exactly one correct answer. Designed for exam revision, conceptual clarity, and identifying commonly confused Java concepts.",
            "tags": [
                  "Java",
                  "Java Programming",
                  "NPTEL",
                  "NPTEL Exam",
                  "OOP",
                  "Encapsulation",
                  "Inheritance",
                  "Interfaces",
                  "Packages",
                  "Exception Handling",
                  "Multithreading",
                  "Java I/O",
                  "Applets",
                  "AWT",
                  "Swing",
                  "Networking",
                  "JDBC",
                  "Computer Science",
                  "MCQ",
                  "Exam Preparation"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvf1v9sf_pahns"
      },
      {
            "id": "qz_mvhq2dq8_ljmpc",
            "title": "Introduction to React.js: Fundamentals and Core Concepts Quiz",
            "subject": "PLA/JSX/001",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 50,
            "description": "Test your knowledge of React.js fundamentals, including components, JSX, props, state, event handling, Hooks, rendering, and Virtual DOM concepts. This 50-question multiple-choice quiz is designed for beginners, BCA students, and aspiring frontend developers. Each question contains four carefully selected options, with only one completely correct answer. Evaluate your understanding of React and strengthen your foundation for practical development and technical interviews.",
            "tags": [
                  "React",
                  "React.js",
                  "JavaScript",
                  "Frontend Development",
                  "Web Development",
                  "JSX",
                  "React Components",
                  "React Hooks",
                  "Virtual DOM",
                  "BCA",
                  "Programming Quiz",
                  "Beginner"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvhq2dq8_ljmpc"
      },
      {
            "id": "qz_mvml17pz_l450b",
            "title": "Getting Started with HTML - Level 1",
            "subject": "WD/001",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 15,
            "description": "Test your HTML knowledge with 15 beginner-friendly MCQs covering HTML basics, document structure, tags, attributes, hyperlinks, images, lists, and forms. Ideal for BCA students and aspiring web developers, this quiz helps strengthen foundational web development concepts and prepares learners for practical coding and academic assessments.",
            "tags": [
                  "HTML",
                  "HTML Basics",
                  "Web Development",
                  "Beginner"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvml17pz_l450b"
      },
      {
            "id": "qz_mvnlnkh7_snxfm",
            "title": "Getting Started with HTML - Level 2",
            "subject": "WD/001",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 40,
            "description": "Level 2 HTML and web fundamentals quiz for BCA students. Covers web history, protocols, ports, UTF-8, metadata, on-page SEO, structured data, semantic HTML, color theory, gradients, links, and console debugging. 30 prepared MCQs and 10 contributor placeholders.",
            "tags": [
                  "HTML",
                  "WWW",
                  "HTTP",
                  "HTTPS",
                  "TLS",
                  "FTP",
                  "Status Codes",
                  "Ports",
                  "UTF-8",
                  "SEO",
                  "Schema",
                  "Semantic HTML",
                  "Color",
                  "Gradients",
                  "Navigation",
                  "Console"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvnlnkh7_snxfm"
      },
      {
            "id": "qz_mvo67kpe_r3y0w",
            "title": "Recreation & Organization of Sports — Unit 1 / 2 Quiz",
            "subject": "24PED401MI01",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 20,
            "description": "B.A. Physical Education MIC practice quiz based on the previous 1st Semester syllabus used for the December 2024 examination. Covers Units 1 and 2 through long-question topics and case studies. Review each question and answer key before publishing.",
            "tags": [
                  "B.A. Physical Education",
                  "MIC",
                  "Recreation",
                  "Recreational Activities",
                  "Programme Planning",
                  "Communicable Diseases",
                  "Postural Deformities",
                  "Sports Injuries",
                  "First Aid"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvo67kpe_r3y0w"
      },
      {
            "id": "qz_mvp9x5y0_ttmaf",
            "title": "C++ Beginner Quiz — Level 1",
            "subject": "24BCA403DS02",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 30,
            "description": "Test your foundational understanding of Object-Oriented Programming using C++. This beginner-level quiz covers classes and objects, encapsulation, abstraction, inheritance, polymorphism, constructors, destructors, and basic OOP principles. Use the results to identify knowledge gaps, strengthen programming concepts, and prepare for academic assessments and coding interviews.",
            "tags": [
                  "C++",
                  "OOPS",
                  "Classes",
                  "Objects",
                  "Encapsulation",
                  "Abstraction",
                  "Inheritance",
                  "Polymorphism",
                  "Constructors",
                  "Destructors"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvp9x5y0_ttmaf"
      },
      {
            "id": "qz_mvwezknv_mycu7",
            "title": "Software Engineering Unit 1: Fundamentals, SDLC Models and Project Management Quiz",
            "subject": "25BCA405DS01",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 15,
            "description": "Assess your understanding of Unit 1 of BCA Software Engineering (25BCA405DS01) with 15 MCQ and MSQ questions across software fundamentals, software crisis, process models, project planning, scheduling and risk management.",
            "tags": [
                  "Software Engineering",
                  "Unit 1",
                  "Introduction to Software Engineering",
                  "Software Characteristics",
                  "Software Crisis",
                  "Software Process",
                  "Software Development Life Cycle",
                  "Waterfall Model",
                  "Prototype Model",
                  "Iterative Model",
                  "Timeboxing",
                  "Spiral Model",
                  "RAD Model",
                  "Object-Oriented Model",
                  "Software Project Management",
                  "Project Planning",
                  "Project Scheduling",
                  "Risk Management",
                  "BCA",
                  "MDU"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mvwezknv_mycu7"
      },
      {
            "id": "qz_mw3kxbdm_9nkvn",
            "title": "Software Engineering Assignment 2 – Comprehensive Assessment",
            "subject": "25BCA405DS01",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 15,
            "description": "Test your understanding of Software Engineering Assignment 2 through 15 MCQ and MSQ questions covering coupling and cohesion, software testing and its objectives, software maintenance types, and Software Quality Assurance planning and activities. Designed for BCA Semester V revision and concept assessment.",
            "tags": [
                  "Software Engineering",
                  "Coupling",
                  "Cohesion",
                  "Software Testing",
                  "SDLC",
                  "Software Maintenance",
                  "Corrective Maintenance",
                  "Adaptive Maintenance",
                  "Perfective Maintenance",
                  "Preventive Maintenance",
                  "Software Quality Assurance",
                  "SQAP",
                  "BCA Semester 5"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mw3kxbdm_9nkvn"
      },
      {
            "id": "qz_mwgd1tdx_7fq56",
            "title": "Web Application Development | Assignment 3 & 4 – Conceptual MCQ Test",
            "subject": "26BCA403DS04",
            "ownerName": "Akshat Prasad",
            "ownerUid": "CCoQSLFfzWf4NGF6zox3tO399Xg1",
            "totalQuestions": 20,
            "description": "A 12-question conceptual assessment based on the four Assignment 3 & 4 topics: JavaScript functions and pop-up boxes; XML structure and XSL; cookies and sessions in PHP; and basic PHP commands. All questions focus on theory, concepts, purposes, features, and differences rather than writing code. Designed for BCA Semester V students.",
            "tags": [
                  "JavaScript Functions",
                  "JavaScript Pop-up Boxes",
                  "XML Structure",
                  "XSL",
                  "XSLT",
                  "XPath",
                  "PHP Cookies",
                  "PHP Sessions",
                  "PHP Basics"
            ],
            "url": "https://dpgnotes.web.app/Quizes/index.html?quizId=qz_mwgd1tdx_7fq56"
      }
]
  };

  // ==========================================
  // INDEXEDDB PERSISTENCE HELPERS
  // ==========================================
  function openSyncDatabase() {
    return new Promise(function(resolve, reject) {
      if (!window.indexedDB) {
        return reject(new Error("IndexedDB not supported"));
      }
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
      request.onerror = function(e) {
        reject(e.target.error);
      };
    });
  }

  function getSyncRecord(db) {
    return new Promise(function(resolve, reject) {
      try {
        var tx = db.transaction([STORE_NAME], "readonly");
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(SYNC_RECORD_KEY);
        req.onsuccess = function() {
          resolve(req.result || null);
        };
        req.onerror = function() {
          resolve(null);
        };
      } catch(err) {
        resolve(null);
      }
    });
  }

  function saveSyncRecord(db, record) {
    return new Promise(function(resolve, reject) {
      try {
        var tx = db.transaction([STORE_NAME], "readwrite");
        var store = tx.objectStore(STORE_NAME);
        var req = store.put(record);
        req.onsuccess = function() {
          resolve(true);
        };
        req.onerror = function(e) {
          reject(e.target.error);
        };
      } catch(err) {
        reject(err);
      }
    });
  }

  // ==========================================
  // SCHEMA.ORG JSON-LD GENERATION
  // ==========================================
  function generateJsonLdData(dynamicItems) {
    dynamicItems = dynamicItems || {};

    var allContributors = (PREDEFINED_VAULT.contributors || []).concat(dynamicItems.contributors || []);
    var allPdfs = (PREDEFINED_VAULT.pdfResources || []).concat(dynamicItems.pdfResources || []);
    var allPracticals = (PREDEFINED_VAULT.practicalSolutions || []).concat(dynamicItems.practicalSolutions || []);
    var allAssignments = (PREDEFINED_VAULT.assignmentSolutions || []).concat(dynamicItems.assignmentSolutions || []);
    var allQuizzes = (PREDEFINED_VAULT.quizzes || []).concat(dynamicItems.quizzes || []);

    // Deduplicate lists by unique ID
    function dedupe(arr, key) {
      var seen = new Set();
      return arr.filter(function(item) {
        if (!item) return false;
        var val = item[key] || item.id || item.uid;
        if (!val || seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }

    allContributors = dedupe(allContributors, 'uid');
    allPdfs = dedupe(allPdfs, 'id');
    allPracticals = dedupe(allPracticals, 'id');
    allAssignments = dedupe(allAssignments, 'id');
    allQuizzes = dedupe(allQuizzes, 'id');

    var itemListElements = [];
    var position = 1;

    // 1. Navigation Hubs
    PREDEFINED_VAULT.hubs.forEach(function(hub) {
      itemListElements.push({
        "@type": "SiteNavigationElement",
        "position": position++,
        "name": hub.name,
        "url": hub.url,
        "description": hub.description
      });
    });

    // 2. Contributor Profiles
    allContributors.forEach(function(c) {
      itemListElements.push({
        "@type": "Person",
        "position": position++,
        "name": c.name,
        "url": c.profileUrl,
        "jobTitle": c.role,
        "email": c.email || undefined
      });
    });

    // 3. PDF Educational Resources
    allPdfs.forEach(function(p) {
      itemListElements.push({
        "@type": "DigitalDocument",
        "position": position++,
        "name": p.title,
        "url": p.url,
        "description": p.description,
        "keywords": p.tags,
        "about": p.subject
      });
    });

    // 4. Practical Lab Solutions
    allPracticals.forEach(function(p) {
      itemListElements.push({
        "@type": "TechArticle",
        "position": position++,
        "name": p.title,
        "url": p.url,
        "description": p.description,
        "keywords": p.tags,
        "author": { "@type": "Person", "name": p.contributorName }
      });
    });

    // 5. Assignment Solutions
    allAssignments.forEach(function(a) {
      itemListElements.push({
        "@type": "Article",
        "position": position++,
        "name": a.title,
        "url": a.url,
        "description": a.description,
        "keywords": a.tags,
        "author": { "@type": "Person", "name": a.contributorName }
      });
    });

    // 6. Quizzes
    allQuizzes.forEach(function(q) {
      itemListElements.push({
        "@type": "Quiz",
        "position": position++,
        "name": q.title,
        "url": q.url,
        "description": q.description,
        "keywords": q.tags,
        "educationalLevel": "University / College"
      });
    });

    // Current page context enrichment
    var currentUrl = window.location.href;
    var currentPath = window.location.pathname;
    var urlParams = new URLSearchParams(window.location.search);

    var specificElement = null;
    if (currentPath.includes("dpgnotes-pdf-viewer")) {
      var rId = urlParams.get("resourceId") || urlParams.get("pdfId") || urlParams.get("docId");
      var matchedDoc = allPdfs.find(function(x) { return x.id === rId; });
      if (matchedDoc) {
        specificElement = {
          "@type": "DigitalDocument",
          "@id": currentUrl,
          "name": matchedDoc.title,
          "url": currentUrl,
          "description": matchedDoc.description,
          "keywords": matchedDoc.tags,
          "about": matchedDoc.subject
        };
      }
    } else if (currentPath.includes("PracticalSolution")) {
      var pId = urlParams.get("id");
      var matchedPrac = allPracticals.find(function(x) { return x.id === pId; });
      if (matchedPrac) {
        specificElement = {
          "@type": "TechArticle",
          "@id": currentUrl,
          "name": matchedPrac.title,
          "url": currentUrl,
          "description": matchedPrac.description,
          "keywords": matchedPrac.tags,
          "author": { "@type": "Person", "name": matchedPrac.contributorName }
        };
      }
    } else if (currentPath.includes("AssignmentSolution")) {
      var aId = urlParams.get("id");
      var matchedAssign = allAssignments.find(function(x) { return x.id === aId; });
      if (matchedAssign) {
        specificElement = {
          "@type": "Article",
          "@id": currentUrl,
          "name": matchedAssign.title,
          "url": currentUrl,
          "description": matchedAssign.description,
          "keywords": matchedAssign.tags,
          "author": { "@type": "Person", "name": matchedAssign.contributorName }
        };
      }
    } else if (currentPath.includes("Quizes")) {
      var qId = urlParams.get("quizId") || urlParams.get("id");
      var matchedQuiz = allQuizzes.find(function(x) { return x.id === qId; });
      if (matchedQuiz) {
        specificElement = {
          "@type": "Quiz",
          "@id": currentUrl,
          "name": matchedQuiz.title,
          "url": currentUrl,
          "description": matchedQuiz.description,
          "keywords": matchedQuiz.tags,
          "educationalLevel": "University / College"
        };
      }
    } else if (currentPath.includes("profile.html")) {
      var uId = urlParams.get("uid");
      var matchedUser = allContributors.find(function(x) { return x.uid === uId; });
      if (matchedUser) {
        specificElement = {
          "@type": "Person",
          "@id": currentUrl,
          "name": matchedUser.name,
          "url": currentUrl,
          "jobTitle": matchedUser.role,
          "email": matchedUser.email || undefined
        };
      }
    }

    var graph = [
      {
        "@type": "WebSite",
        "@id": "https://dpgnotes.web.app/#website",
        "url": "https://dpgnotes.web.app/",
        "name": "DPGNotes",
        "description": "Verified Academic Notes, University Question Papers, Assignment Solutions, Practical Lab Files & Quizzes",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://dpgnotes.web.app/dpgnotes-serp.html?tag={search_term_string}&tab=all",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        "@id": "https://dpgnotes.web.app/#catalog",
        "name": "DPGNotes Master Academic Navigation & Resources",
        "itemListElement": itemListElements
      }
    ];

    if (specificElement) {
      graph.push(specificElement);
    }

    return {
      "@context": "https://schema.org",
      "@graph": graph
    };
  }

  // ==========================================
  // RUNTIME INJECTION ENGINE
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

      // Inject at the very top of <head>
      if (document.head) {
        if (document.head.firstChild) {
          document.head.insertBefore(script, document.head.firstChild);
        } else {
          document.head.appendChild(script);
        }
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          if (document.head.firstChild) {
            document.head.insertBefore(script, document.head.firstChild);
          } else {
            document.head.appendChild(script);
          }
        });
      }
    } catch(e) {
      console.warn("JSON-LD injection warning:", e);
    }
  }

  // ==========================================
  // DYNAMIC REFRESH (EVERY 12 HOURS)
  // ==========================================
  async function fetchFreshFirestoreResources() {
    var results = {
      contributors: [],
      pdfResources: [],
      assignmentSolutions: [],
      practicalSolutions: [],
      quizzes: []
    };

    var knownPdfIds = new Set(PREDEFINED_VAULT.pdfResources.map(function(x) { return x.id; }));
    var knownAssignIds = new Set(PREDEFINED_VAULT.assignmentSolutions.map(function(x) { return x.id; }));
    var knownPracIds = new Set(PREDEFINED_VAULT.practicalSolutions.map(function(x) { return x.id; }));
    var knownQuizIds = new Set(PREDEFINED_VAULT.quizzes.map(function(x) { return x.id; }));
    var knownUids = new Set(PREDEFINED_VAULT.contributors.map(function(x) { return x.uid; }));

    // Strategy 1 (Primary): Fetch from 24/7 Render Crawler Service
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
      var resp = await fetch(RENDER_CRAWLER_ENDPOINT, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp && resp.ok) {
        var catalogJson = await resp.json();
        var catalog = catalogJson.data || catalogJson;
        if (catalog && catalog.pdfResources) {
          (catalog.contributors || []).forEach(function(c) {
            if (c.uid && !knownUids.has(c.uid)) {
              results.contributors.push(c);
              knownUids.add(c.uid);
            }
          });
          (catalog.pdfResources || []).forEach(function(p) {
            if (p.id && !knownPdfIds.has(p.id)) {
              results.pdfResources.push(p);
              knownPdfIds.add(p.id);
            }
          });
          (catalog.assignmentSolutions || []).forEach(function(a) {
            if (a.id && !knownAssignIds.has(a.id)) {
              results.assignmentSolutions.push(a);
              knownAssignIds.add(a.id);
            }
          });
          (catalog.practicalSolutions || []).forEach(function(pr) {
            if (pr.id && !knownPracIds.has(pr.id)) {
              results.practicalSolutions.push(pr);
              knownPracIds.add(pr.id);
            }
          });
          (catalog.quizzes || []).forEach(function(q) {
            if (q.id && !knownQuizIds.has(q.id)) {
              results.quizzes.push(q);
              knownQuizIds.add(q.id);
            }
          });
          return results;
        }
      }
    } catch (e) {
      // Backend crawler fetch timed out or offline, fall back to direct client / REST
    }

    // Strategy 2: Direct Client Firestore SDK fallback
    var db = window.dpgDb || window.solDb || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
    var projectId = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) || "dpgnotes";
    var restBase = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents";

    // 1. Fetch PDF Resources
    try {
      if (db && window.collection && window.getDocs && window.query && window.limit) {
        var snap = await window.getDocs(window.query(window.collection(db, "documents"), window.limit(50)));
        snap.forEach(function(docSnap) {
          var d = docSnap.data() || {};
          var docId = d.documentId || docSnap.id;
          if (docId && !knownPdfIds.has(docId)) {
            results.pdfResources.push({
              id: docId,
              title: d.title || "Academic Educational Resource",
              subject: d.discipline || d.subject || "General Academic",
              category: d.category || "Notes",
              description: d.description || ("Verified notes on " + (d.title || docId)),
              tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
              uploader: d.userName || d.uploader || d.uploaderEmail || "Verified Contributor",
              uploaderEmail: d.uploaderEmail || "",
              url: "https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=" + encodeURIComponent(docId)
            });
            knownPdfIds.add(docId);
          }
        });
      } else {
        var resp = await fetch(restBase + "/documents?pageSize=50").then(function(r) { return r.json(); });
        if (resp && resp.documents) {
          resp.documents.forEach(function(docItem) {
            var f = docItem.fields || {};
            var docId = (f.documentId && f.documentId.stringValue) || docItem.name.split('/').pop();
            if (docId && !knownPdfIds.has(docId)) {
              results.pdfResources.push({
                id: docId,
                title: (f.title && f.title.stringValue) || "Academic Educational Resource",
                subject: (f.discipline && f.discipline.stringValue) || (f.subject && f.subject.stringValue) || "General Academic",
                category: (f.category && f.category.stringValue) || "Notes",
                description: (f.description && f.description.stringValue) || "",
                tags: (f.tags && f.tags.stringValue) || "",
                uploader: (f.userName && f.userName.stringValue) || "Verified Contributor",
                uploaderEmail: "",
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

    // 2. Fetch Solutions
    try {
      if (db && window.solCollectionGroup && window.solGetDocs && window.solQuery && window.solLimit) {
        var solSnap = await window.solGetDocs(window.solQuery(window.solCollectionGroup(db, "solutions"), window.solLimit(60)));
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
                contributorUid: d.contributorUid || "",
                contributorName: d.studentName || d.contributorName || "Verified Contributor",
                contributorEmail: d.contributorEmail || "",
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
                course: d.course || "Coursework",
                contributorUid: d.contributorUid || "",
                contributorName: d.studentName || d.contributorName || "Verified Contributor",
                contributorEmail: d.contributorEmail || "",
                description: "Verified university assignment solution with questions and step-by-step answers for " + (d.subjectName || solId),
                tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
                url: "https://dpgnotes.web.app/AssignmentSolution/index.html?id=" + encodeURIComponent(solId)
              });
              knownAssignIds.add(solId);
            }
          }
        });
      }
    } catch(solErr) {
      console.warn("Sitemap: Solutions fetch notice:", solErr);
    }

    // 3. Fetch Quizzes
    try {
      if (db && window.collection && window.getDocs && window.query && window.limit) {
        var qzSnap = await window.getDocs(window.query(window.collection(db, "quizDirectory"), window.limit(30)));
        qzSnap.forEach(function(docSnap) {
          var d = docSnap.data() || {};
          var qzId = d.quizId || docSnap.id;
          if (qzId && !knownQuizIds.has(qzId)) {
            results.quizzes.push({
              id: qzId,
              title: d.title || "Academic Assessment",
              subject: d.subjectCode || d.subjectName || "Online Quiz",
              ownerName: d.ownerName || "Educator",
              ownerUid: d.ownerUid || "",
              totalQuestions: d.totalQuestions || 0,
              description: d.description || ("Timed quiz and MCQ assessment on " + (d.title || qzId)),
              tags: Array.isArray(d.topicTags) ? d.topicTags.join(', ') : (d.topicTags || d.tags || ''),
              url: "https://dpgnotes.web.app/Quizes/index.html?quizId=" + encodeURIComponent(qzId)
            });
            knownQuizIds.add(qzId);
          }
        });
      }
    } catch(qzErr) {
      console.warn("Sitemap: Quiz fetch notice:", qzErr);
    }

    return results;
  }

  // ==========================================
  // INITIALIZATION CONTROLLER
  // ==========================================
  async function initSiteMapNav() {
    // Stage 1: Immediate synchronous injection of 100% genuine predefined vault
    var initialJsonLd = generateJsonLdData({});
    injectJsonLd(initialJsonLd);

    // Stage 2: Check IndexedDB for 12-hour sync schedule per device
    try {
      var idb = await openSyncDatabase();
      var syncRecord = await getSyncRecord(idb);

      var cachedDynamicItems = (syncRecord && syncRecord.dynamicResources) || {
        contributors: [],
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
        // Run background fetch without blocking page render
        setTimeout(async function() {
          try {
            var freshItems = await fetchFreshFirestoreResources();

            // Merge fresh items with cached items
            var merged = {
              contributors: (cachedDynamicItems.contributors || []).concat(freshItems.contributors || []),
              pdfResources: (cachedDynamicItems.pdfResources || []).concat(freshItems.pdfResources || []),
              assignmentSolutions: (cachedDynamicItems.assignmentSolutions || []).concat(freshItems.assignmentSolutions || []),
              practicalSolutions: (cachedDynamicItems.practicalSolutions || []).concat(freshItems.practicalSolutions || []),
              quizzes: (cachedDynamicItems.quizzes || []).concat(freshItems.quizzes || [])
            };

            // Deduplicate by ID
            function dedupeList(arr, key) {
              var seen = new Set();
              return arr.filter(function(x) {
                if (!x) return false;
                var val = x[key] || x.id || x.uid;
                if (!val || seen.has(val)) return false;
                seen.add(val);
                return true;
              });
            }

            merged.contributors = dedupeList(merged.contributors, 'uid');
            merged.pdfResources = dedupeList(merged.pdfResources, 'id');
            merged.assignmentSolutions = dedupeList(merged.assignmentSolutions, 'id');
            merged.practicalSolutions = dedupeList(merged.practicalSolutions, 'id');
            merged.quizzes = dedupeList(merged.quizzes, 'id');

            // Save to IndexedDB
            await saveSyncRecord(idb, {
              id: SYNC_RECORD_KEY,
              lastSyncTimestamp: now,
              dynamicResources: merged
            });

            // Update JSON-LD with enriched graph
            injectJsonLd(generateJsonLdData(merged));
          } catch(syncErr) {
            console.warn("Background sitemap sync notice:", syncErr);
          }
        }, 1200);
      }
    } catch(e) {
      console.warn("Sitemap IndexedDB init warning:", e);
    }
  }

  // Execute immediately so script injects JSON-LD into <head> as early as possible
  initSiteMapNav();
})();
