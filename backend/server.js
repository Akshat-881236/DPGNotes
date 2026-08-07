require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const admin = require('firebase-admin');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const crypto = require('crypto');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const rateLimit = require('express-rate-limit');

// ==========================================
// INIT APP
// ==========================================
const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Load AI training legal dataset
let trainingData = "";
try {
  trainingData = fs.readFileSync(path.join(__dirname, 'training.md'), 'utf8');
} catch (e) {
  console.error("Failed to read training.md:", e);
}

// ==========================================
// ROUTES: HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
  res.send('DPGNotes API is running successfully!');
});

// ==========================================
// ROUTES: SITEMAP (SEO)
// ==========================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    let documents = [];
    if (db) {
      const snapshot = await db.collection("documents").get();
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });
    } else {
      // Fallback REST API
      const firestoreRes = await axios.get('https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/documents?pageSize=1000');
      if (firestoreRes.data && firestoreRes.data.documents) {
        firestoreRes.data.documents.forEach(doc => {
          const docId = doc.name.split('/').pop();
          const fields = doc.fields || {};
          documents.push({
            id: docId,
            pdfUrl: fields.pdfUrl?.stringValue || '',
            title: fields.title?.stringValue || '',
            category: fields.category?.stringValue || '',
            discipline: fields.discipline?.stringValue || '',
            userName: fields.userName?.stringValue || fields.uploader?.stringValue || 'Contributor',
            description: fields.description?.stringValue || '',
            tags: fields.tags?.arrayValue?.values?.map(v => v.stringValue) || (fields.tags?.stringValue ? fields.tags.stringValue.split(',') : [])
          });
        });
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const baseUrl = "https://dpgnotes.web.app";
    xml += `  <url>\n    <loc>${baseUrl}/index.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/dpgnotes-search-engine.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/dpgnotes-serp.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/legal/index.html</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;

    documents.forEach(d => {
      const tagsStr = Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || '');
      let viewerUrl = `${baseUrl}/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(d.pdfUrl || '')}&title=${encodeURIComponent(d.title || '')}&category=${encodeURIComponent(d.category || '')}&discipline=${encodeURIComponent(d.discipline || '')}&uploader=${encodeURIComponent(d.userName || 'Contributor')}&docid=${encodeURIComponent(d.id)}&description=${encodeURIComponent(d.description || '')}&tags=${encodeURIComponent(tagsStr)}&search-token=SEO_SITEMAP`;

      // Escape XML characters properly
      viewerUrl = viewerUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

      xml += `  <url>\n    <loc>${viewerUrl}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Sitemap Generation Error:", error.message);
    res.status(500).send("Error generating sitemap");
  }
});

// ==========================================
// INIT FIREBASE ADMIN
// ==========================================
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let envVar = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // If it doesn't start with '{', assume it is Base64 encoded
    if (!envVar.startsWith('{')) {
      envVar = Buffer.from(envVar, 'base64').toString('utf8');
    }
    
    // Sometimes platforms escape newlines, so we ensure \n is properly handled for the private key
    envVar = envVar.replace(/\\\\n/g, '\\n');
    
    serviceAccount = JSON.parse(envVar);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin Initialized.");
} catch (error) {
  console.error("Firebase Admin Initialization Error: Please provide a valid serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT environment variable. Details:", error.message);
}
let db = null;
if (admin.firestore) {
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
}

// ==========================================
// INIT CLOUDINARY
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// IN-MEMORY OTP STORE (For simplicity, use Redis or DB in prod)
// ==========================================
const otpStore = new Map();

// ==========================================
// BREVO EMAIL SENDER
// ==========================================
async function sendEmail(toEmail, subject, htmlContent) {
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: process.env.EMAIL_FROM_NAME, email: process.env.EMAIL_FROM },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Email sent to ${toEmail}`);
  } catch (err) {
    console.error("Email sending failed:", err.response ? err.response.data : err.message);
  }
}

// ==========================================
// ROUTES: CLOUDINARY UPLOAD
// ==========================================
app.post('/api/upload', upload.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const uploadedFile = req.file || (req.files && (req.files.pdfFile?.[0] || req.files.file?.[0] || req.files.image?.[0]));
    let uploadPayload = "";
    if (uploadedFile) {
      const b64 = Buffer.from(uploadedFile.buffer).toString('base64');
      uploadPayload = "data:" + uploadedFile.mimetype + ";base64," + b64;
    } else if (req.body && req.body.base64Data) {
      uploadPayload = req.body.base64Data;
    } else {
      return res.status(400).json({ error: "No file or base64Data provided" });
    }

    const isProfile = req.query.type === 'profile' || req.query.type === 'support' || (uploadPayload && uploadPayload.startsWith("data:image"));
    const isPdf = (uploadedFile && (uploadedFile.mimetype === 'application/pdf' || uploadedFile.originalname?.toLowerCase().endsWith('.pdf'))) ||
                  (uploadPayload && uploadPayload.startsWith("data:application/pdf"));

    let options = {};
    if (isProfile) {
      options = {
        resource_type: "image",
        folder: "dpgnotes_profiles"
      };
    } else if (isPdf) {
      const uniqueId = Math.random().toString(36).substring(2, 10) + "_" + Date.now();
      options = {
        resource_type: "raw",
        public_id: `dpgnotes_pdfs/${uniqueId}`
      };
    } else {
      options = {
        resource_type: "auto",
        folder: "dpgnotes_pdfs"
      };
    }

    const result = await cloudinary.uploader.upload(uploadPayload, options);
    
    res.json({ pdfUrl: result.secure_url, url: result.secure_url, secure_url: result.secure_url });
  } catch (error) {
    console.error("Upload Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

// ==========================================
// ROUTES: COMPRESS PDF
// ==========================================
const FormData = require('form-data');
app.post('/api/compress', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const quality = req.body.quality || 'recommended'; // extreme, recommended, low
    
    const ILOVEPDF_PUBLIC = "project_public_cac672f3bd53ada24fa8eaa2c2e870da_r3vjib667b1a65319e45b1bea7d655b921920";
    
    // 1. Auth
    const authRes = await axios.post('https://api.ilovepdf.com/v1/auth', { public_key: ILOVEPDF_PUBLIC });
    const token = authRes.data.token;
    
    // 2. Start Task
    const startRes = await axios.get('https://api.ilovepdf.com/v1/start/compress', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const server = startRes.data.server;
    const task = startRes.data.task;
    
    // 3. Upload File
    const FormData = require('form-data');
    const form = new FormData();
    form.append('task', task);
    form.append('file', req.file.buffer, { filename: req.file.originalname || 'document.pdf' });
    
    const uploadRes = await axios.post(`https://${server}/v1/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` }
    });
    const serverFilename = uploadRes.data.server_filename;
    
    // 4. Process
    await axios.post(`https://${server}/v1/process`, {
      task: task,
      tool: 'compress',
      files: [{ server_filename: serverFilename, filename: req.file.originalname || 'document.pdf' }],
      compression_level: quality
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    // 5. Download
    const downloadRes = await axios.get(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });
    
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="compressed_${req.file.originalname || 'document.pdf'}"`);
    res.send(downloadRes.data);
    
  } catch (error) {
    console.error("Compression Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Compression failed" });
  }
});


// ==========================================
// ROUTES: AI TRAIN MODEL
// ==========================================
app.post('/api/ai/train-model', async (req, res) => {
  try {
    const { resourceId, urls = [], faqs = [], userId } = req.body;
    if (!resourceId) {
      return res.status(400).json({ error: "Missing resourceId" });
    }

    let crawledData = "";
    // Web Link Crawling (Fetch title/text snippet for external links)
    for (const linkUrl of urls) {
      try {
        const linkRes = await axios.get(linkUrl, { timeout: 4000, headers: { 'User-Agent': 'DPGNotes-AI-Crawler/1.0' } });
        if (typeof linkRes.data === 'string') {
          const titleMatch = linkRes.data.match(/<title>([^<]*)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim() : linkUrl;
          crawledData += `\n[Crawled Link: ${linkUrl}] - Title: ${pageTitle}\n`;
        }
      } catch (linkErr) {
        console.warn(`Link crawl skipped for ${linkUrl}:`, linkErr.message);
      }
    }

    let knowledgeMd = `# Runtime Knowledge Model for Resource: ${resourceId}\n\n`;
    knowledgeMd += `## FAQ Knowledge Base\n`;
    faqs.forEach((f, idx) => {
      const q = (f.query || '').substring(0, 80);
      const a = (f.solution || '').substring(0, 300);
      knowledgeMd += `### Q${idx + 1}: ${q}\n**Answer**: ${a}\n\n`;
    });
    if (crawledData) {
      knowledgeMd += `## Crawled External Web Context\n${crawledData}\n`;
    }

    // Save to Firestore if admin DB exists
    if (db) {
      await db.collection("resource_knowledge").doc(resourceId).set({
        resourceId,
        knowledgeMd,
        faqs,
        urls,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    res.json({ success: true, resourceId, knowledgeMd });
  } catch (err) {
    console.error("Train model route error:", err);
    res.status(500).json({ error: "Failed to train AI model: " + err.message });
  }
});

// ==========================================
// ROUTES: AI ANALYSIS & CHAT (PYTHON INTERCONNECTION)
// ==========================================
app.post('/api/ai/analyse-document', async (req, res) => {
  try {
    const data = req.body?.data || req.body || {};
    const title = data.title || 'Academic Document';
    const category = data.category || 'Notes';
    const discipline = data.discipline || 'General';
    const description = data.description || '';
    const resourceId = data.docid || data.id || data.resourceId || '';
    const extractedPdfText = data.extractedPdfText || '';
    const knowledgeMd = data.knowledgeMd || '';

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Priority 1: Gemini API Engine for Lengthy, Independent, Rich Analysis
    if (geminiKey) {
      try {
        const prompt = `You are DPGNotes AI Intelligence Engine. Perform an in-depth, comprehensive academic analysis of the following study resource for university students.
Provide a lengthy, structured response using rich Markdown syntax with:
- Executive Summary & Overview (### 📘 Executive Summary)
- Core Concepts & Syllabus Topics Covered (#### 📌 Key Academic Concepts)
- Important Definitions, Formulas & Exam Insights
- Single-Open Collapsible Q&A Accordions (<details><summary><b>Q: Frequently Asked Exam Question</b></summary>A: Detailed Answer</details>)
- Relevant Educational YouTube Video Links / Study Resources

Document Title: ${title}
Category: ${category}
Discipline: ${discipline}
Description: ${description}
Extracted PDF Text: ${extractedPdfText.slice(0, 3000)}
Runtime Knowledge Base: ${knowledgeMd.slice(0, 3000)}`;

        const gRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          contents: [{ parts: [{ text: prompt }] }]
        }, { timeout: 10000 });

        const report = gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (report && report.length > 50) {
          return res.json({ report, source: 'Gemini-API-Intelligence' });
        }
      } catch (gErr) {
        console.warn("Gemini API call warning in analyse-document, falling back:", gErr.message);
      }
    }

    // 2. Priority 2: Python AI Service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'https://dpgnotes-python-service.onrender.com';
    try {
      const pyRes = await axios.post(`${pythonServiceUrl}/api/py/db-ai-analyze`, {
        prompt: `Provide a comprehensive academic analysis and summary for document: ${title}. Category: ${category}, Discipline: ${discipline}. Description: ${description}`,
        resourceId: resourceId
      }, { timeout: 5000 });

      if (pyRes.data && (pyRes.data.answer || pyRes.data.report)) {
        return res.json({ report: pyRes.data.answer || pyRes.data.report, source: 'Python-AI-Engine' });
      }
    } catch (pyErr) {
      console.warn("Python AI Engine endpoint offline/unreachable:", pyErr.message);
    }

    // 3. Fallback Academic Summary
    const fallbackReport = `### 📘 Academic Summary: ${title}

- **Category**: ${category}
- **Discipline**: ${discipline}
${description ? `- **Overview**: ${description}\n` : ''}
#### 💡 Key Study Tips:
1. Review core formulas and key definitions from this resource.
2. Cross-reference topic headings with DPG College syllabus guidelines.
3. Utilize DPGNotes AI Chat to ask specific questions about formulas or questions in this document.`;

    res.json({ report: fallbackReport, source: 'DPGNotes-Academic-Engine' });
  } catch (err) {
    console.error("Analyse document route error:", err);
    res.json({ 
      report: `### 📘 Document Overview\n- **Status**: Analysis ready.\n- **Tips**: Feel free to use AI Chat Assistant below to query specific sections of this document.`,
      source: 'Safe-Fallback'
    });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, question, resourceId, systemContext, context, history } = req.body;
    const userQuery = prompt || question || (history && history.length > 0 ? history[history.length - 1].text : "Summarize document");
    const docTitle = context?.documentTitle || 'Academic Resource';
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Priority 1: Gemini API Engine for Lengthy, Independent, High-Quality Answers
    if (geminiKey) {
      try {
        const fullPrompt = `You are DPGNotes AI Assistant, an expert academic tutor. Provide an in-depth, highly comprehensive, lengthy, and detailed answer to the student's question.
Format your response using rich Markdown syntax:
- Clear headers (###, ####)
- Bold key terms & definitions
- Bullet points and numbered steps
- Code snippets / mathematical formulas where applicable
- Single-Open Collapsible Q&A Accordions (<details><summary><b>Q: Practice Question</b></summary>A: Explanation</details>)
- Relevant Educational YouTube Video Links (e.g., https://www.youtube.com/watch?v=...) if helpful

Context:
- Document Title: ${docTitle}
- Category: ${context?.documentCategory || 'Notes'}
- Discipline: ${context?.documentDiscipline || 'General'}
- Description: ${context?.documentDescription || 'N/A'}
- Extracted PDF Text: ${context?.extractedPdfText ? context.extractedPdfText.slice(0, 3500) : 'N/A'}
- Knowledge Base: ${context?.knowledgeBase ? context.knowledgeBase.slice(0, 3500) : 'N/A'}

Student Question: ${userQuery}`;

        const gRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          contents: [{ parts: [{ text: fullPrompt }] }]
        }, { timeout: 10000 });

        const answer = gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer && answer.length > 30) {
          return res.json({ answer, source: 'Gemini-API-Intelligence' });
        }
      } catch (gErr) {
        console.warn("Gemini Chat API error, falling back to Python/RAG:", gErr.message);
      }
    }

    // 2. Priority 2: Python Service
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'https://dpgnotes-python-service.onrender.com';
    const targetResourceId = resourceId || (context && context.documentId) || '';

    try {
      const pyRes = await axios.post(`${pythonServiceUrl}/api/py/db-ai-analyze`, {
        prompt: userQuery,
        resourceId: targetResourceId
      }, { timeout: 5000 });

      if (pyRes.data && (pyRes.data.answer || pyRes.data.report)) {
        return res.json({ answer: pyRes.data.answer || pyRes.data.report, source: 'Python-AI-Engine' });
      }
    } catch (pyErr) {
      console.warn("Python AI Chat fallback triggered:", pyErr.message);
    }

    // 3. Priority 3: DPGNotes Intelligent Context RAG Engine
    const qLower = userQuery.toLowerCase().trim();

    if (/^(hi|hello|hey|greetings|hola)/i.test(qLower)) {
      return res.json({
        answer: `👋 Hello! I am **DPGNotes AI Assistant**. I have analyzed **${docTitle}**. Feel free to ask me any questions about formulas, definitions, PYQs, or specific sections in this resource!`,
        source: 'DPGNotes-Intelligent-RAG'
      });
    }

    const kbText = (context?.knowledgeBase || '') + '\n' + (context?.extractedPdfText || '');
    if (kbText.trim() && kbText.length > 20) {
      const words = qLower.split(/\s+/).filter(w => w.length > 2);
      const paragraphs = kbText.split(/\n\n|\r\n\r\n/);
      let bestMatch = "";
      let highestScore = 0;

      for (const p of paragraphs) {
        const pLower = p.toLowerCase();
        let score = 0;
        words.forEach(w => {
          if (pLower.includes(w)) score += 1;
        });
        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      }

      if (bestMatch && highestScore > 0) {
        return res.json({
          answer: `### 📖 Answer from ${docTitle}:\n\n${bestMatch.trim()}`,
          source: 'DPGNotes-Intelligent-RAG'
        });
      }
    }

    return res.json({
      answer: `### 📘 Document Overview: ${docTitle}\n- **Category**: ${context?.documentCategory || 'Notes'}\n- **Discipline**: ${context?.documentDiscipline || 'General'}\n${context?.documentDescription ? `- **Summary**: ${context.documentDescription}\n` : ''}\nYour question regarding **"${userQuery}"** has been recorded. Feel free to ask specific questions about formulas, topics, or definitions in this notes file!`,
      source: 'DPGNotes-Intelligent-RAG'
    });
  } catch (err) {
    console.error("AI chat route error:", err);
    res.json({
      answer: "I am ready to assist you with this document. Feel free to ask any specific academic question!",
      source: 'DPGNotes-Intelligent-RAG'
    });
  }
});

// ==========================================
// ROUTES: INVITATIONS & REFERRAL SYSTEM
// ==========================================
app.post('/api/invite/send', async (req, res) => {
  try {
    const { senderUid, senderEmail, senderName, toEmail, toName } = req.body;
    if (!toEmail) {
      return res.status(400).json({ error: "Target email is required." });
    }

    const cleanToEmail = toEmail.trim().toLowerCase();

    // 1. Check if user email already exists in Firestore users
    if (db) {
      const uSnap = await db.collection("users").where("email", "==", cleanToEmail).get();
      if (!uSnap.empty) {
        return res.status(400).json({ error: "Referrals are for new users only. This email is already registered on DPGNotes." });
      }
    }

    // 2. Generate referral code
    const code = "DPG" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteUrl = `https://dpgnotes.web.app/index.html?code=${code}`;

    const inviteData = {
      referrerCode: code,
      senderUid: senderUid || "anon",
      senderEmail: senderEmail || "contributor@dpgnotes.app",
      senderName: senderName || "DPGNotes Contributor",
      toEmail: cleanToEmail,
      toName: toName || cleanToEmail.split('@')[0],
      status: "Sent",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (db) {
      await db.collection("invitations").add(inviteData);
    }

    // Send email with correct URL format https://dpgnotes.web.app/index.html?code=...
    await sendEmail(
      cleanToEmail,
      `${senderName || 'A friend'} invited you to join DPGNotes!`,
      `<div style="font-family:sans-serif; padding:20px; color:#1e293b;">
        <h2>Join DPGNotes for Free Academic Resources!</h2>
        <p>Your friend <strong>${senderName || senderEmail}</strong> invited you to join DPGNotes.</p>
        <p>Use your personal referral link to register and access all notes, sample papers, and AI tools:</p>
        <a href="${inviteUrl}" style="background:#6366f1; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block; margin:15px 0;">Accept Invitation</a>
        <p style="font-size:0.85rem; color:#64748b;">Or copy this link: <br>${inviteUrl}</p>
      </div>`
    );

    res.json({ success: true, referrerCode: code, inviteUrl });
  } catch (err) {
    console.error("Error sending referral invitation:", err);
    res.status(500).json({ error: "Failed to send invitation: " + err.message });
  }
});

app.post('/api/invite/view', async (req, res) => {
  try {
    const { referrerCode } = req.body;
    if (!referrerCode || !db) return res.json({ success: false });

    const qSnap = await db.collection("invitations").where("referrerCode", "==", referrerCode).get();
    if (!qSnap.empty) {
      const docSnap = qSnap.docs[0];
      const data = docSnap.data();
      // Upgrade status Sent -> View
      if (data.status === "Sent") {
        await docSnap.ref.update({
          status: "View",
          viewedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Referral view update error:", err);
    res.json({ success: false });
  }
});

app.post('/api/invite/accept', async (req, res) => {
  try {
    const { referrerCode, newUserId, newUserEmail } = req.body;
    if (!referrerCode || !newUserEmail || !db) {
      return res.status(400).json({ error: "Missing referral code or user email." });
    }

    const cleanUserEmail = newUserEmail.trim().toLowerCase();
    const qSnap = await db.collection("invitations").where("referrerCode", "==", referrerCode).get();

    if (qSnap.empty) {
      return res.status(404).json({ error: "Referral code not found." });
    }

    const docSnap = qSnap.docs[0];
    const invData = docSnap.data();
    const senderUid = invData.senderUid;
    const expectedEmail = (invData.toEmail || '').trim().toLowerCase();

    // 1. Verify Google Email Matches Referral Target Email
    if (expectedEmail && cleanUserEmail !== expectedEmail) {
      // FRAUD DETECTED: Target email mismatch! Reject invitation & log violation against Sender
      await docSnap.ref.update({ status: "Rejected", rejectedAt: admin.firestore.FieldValue.serverTimestamp(), rejectionReason: "Target email mismatch on login" });

      if (senderUid && senderUid !== "anon") {
        const senderRef = db.collection("users").doc(senderUid);
        const senderDoc = await senderRef.get();
        let prevCount = 0;
        if (senderDoc.exists) prevCount = senderDoc.data().suspensionCount || 0;

        const newCount = prevCount + 1;
        let penaltyDays = 5;
        let isPermanent = false;

        if (newCount === 2) penaltyDays = 12;
        else if (newCount >= 3) isPermanent = true;

        const suspendedUntil = isPermanent ? null : Date.now() + (penaltyDays * 86400000);

        await senderRef.set({
          isSuspended: true,
          isPermanentlySuspended: isPermanent,
          suspendedUntil: suspendedUntil,
          suspensionCount: newCount,
          lastSuspensionReason: `Referral fraud violation: Inviter sent code to ${expectedEmail} but user registered with ${cleanUserEmail}`
        }, { merge: true });

        // Log security violation
        await db.collection("security_violations").add({
          violatorUid: senderUid,
          action: "REFERRAL_FRAUD_VIOLATION",
          expectedEmail,
          actualEmail: cleanUserEmail,
          suspensionCount: newCount,
          penaltyDays: isPermanent ? "PERMANENT" : penaltyDays,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return res.status(403).json({
        error: "Referral code mismatch! The code was issued to a different email address.",
        fraudDetected: true
      });
    }

    // 2. Success: Upgrade status to Accept
    await docSnap.ref.update({
      status: "Accept",
      acceptedByUid: newUserId,
      acceptedByEmail: cleanUserEmail,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Referral accepted successfully!" });
  } catch (err) {
    console.error("Referral accept error:", err);
    res.status(500).json({ error: "Failed to accept referral: " + err.message });
  }
});
// ==========================================
// ROUTES: GUEST QUOTA TRACKING
// ==========================================
app.post('/api/guest-quota', async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const { guestId = 'guest_anon', action = 'page_visit' } = req.body;

    const todayStr = new Date().toISOString().split('T')[0];
    const safeIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');
    const key = `quota_${safeIp}_${guestId}`;

    let pageVisits = 0;
    let pdfViews = 0;

    if (db) {
      const qRef = db.collection("guest_quotas").doc(key);
      const qDoc = await qRef.get();

      if (qDoc.exists) {
        const data = qDoc.data();
        if (data.lastResetDate === todayStr) {
          pageVisits = data.pageVisits || 0;
          pdfViews = data.pdfViews || 0;
        }
      }

      if (action === 'pdf_view') {
        pdfViews += 1;
      } else {
        pageVisits += 1;
      }

      await qRef.set({
        clientIp,
        guestId,
        pageVisits,
        pdfViews,
        lastResetDate: todayStr,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else {
      // In-memory fallback
      if (action === 'pdf_view') pdfViews += 1;
      else pageVisits += 1;
    }

    const MAX_PAGE_VISITS = 6;
    const MAX_PDF_VIEWS = 3;
    const allowed = pageVisits <= MAX_PAGE_VISITS && pdfViews <= MAX_PDF_VIEWS;

    res.json({
      allowed,
      clientIp,
      guestId,
      pageVisits,
      pdfViews,
      maxPageVisits: MAX_PAGE_VISITS,
      maxPdfViews: MAX_PDF_VIEWS
    });
  } catch (err) {
    console.error("Guest quota route error:", err);
    res.json({ allowed: true, error: err.message });
  }
});

// ==========================================
// ROUTES: DEVICE TELEMETRY & LOGGING
// ==========================================
app.post('/api/device-log', async (req, res) => {
  try {
    const rawIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const clientIp = rawIp.startsWith('10.') ? '127.0.0.1' : rawIp;

    const { userType = 'Anonymous', userId = 'anon_guest', email = '', displayName = 'Guest', photoURL = '', permissionGranted = false, hardwareInfo = null } = req.body;
    const userAgentStr = req.headers['user-agent'] || '';

    let isSpoofedUa = false;
    const chromeVerMatch = userAgentStr.match(/Chrome\/(\d+)/i);
    if (chromeVerMatch) {
      const verNum = parseInt(chromeVerMatch[1], 10);
      if (verNum > 135) {
        isSpoofedUa = true;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const safeIp = clientIp.replace(/[^a-zA-Z0-9]/g, '_');
    const safeUser = userId.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = `devlog_${todayStr}_${safeUser}_${safeIp}`;

    if (db) {
      // 1. Fetch IP Geolocation
      let country = "Unknown", city = "Unknown", isp = "Unknown", lat = null, lon = null;
      try {
        const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,country,city,isp,lat,lon`, { timeout: 2500 });
        if (geoRes.data && geoRes.data.status === "success") {
          country = geoRes.data.country || "Unknown";
          city = geoRes.data.city || "Unknown";
          isp = geoRes.data.isp || "Unknown";
          lat = geoRes.data.lat;
          lon = geoRes.data.lon;
        }
      } catch (gErr) {}

      const googleMapsUrl = lat && lon 
        ? `https://www.google.com/maps?q=${lat},${lon}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city + ', ' + country)}`;

      // 2. Log Device Login History
      const logRef = db.collection("device_login_history").doc(docId);
      const logSnap = await logRef.get();

      if (!logSnap.exists) {
        const logData = {
          userType: userType,
          userId: userId,
          email: email || "anonymous@dpgnotes.app",
          displayName: displayName || "Guest",
          photoURL: photoURL || "",
          ipAddress: clientIp,
          googleMapsUrl: googleMapsUrl,
          country: country,
          city: city,
          isp: isp,
          userAgent: userAgentStr,
          isSpoofedUa: isSpoofedUa,
          accessLevel: permissionGranted ? "Advanced (Permission Granted)" : "Nominal (Default)",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          loginDate: todayStr
        };

        if (permissionGranted && hardwareInfo) {
          logData.hardwareInfo = hardwareInfo;
        }

        await logRef.set(logData);
      }

      // 3. Multi-User Device Violation Tracker: Track distinct users per IP
      if (userId && userId !== 'anon_guest' && !userId.startsWith('guest_')) {
        const devTrackerRef = db.collection("device_user_trackers").doc(safeIp);
        const trackerSnap = await devTrackerRef.get();
        let usersMap = {};

        if (trackerSnap.exists) {
          usersMap = trackerSnap.data().usersMap || {};
        }

        usersMap[userId] = {
          userId,
          email: email || "user@dpgnotes.app",
          displayName: displayName || "Contributor",
          photoURL: photoURL || "",
          lastLogin: new Date().toISOString()
        };

        await devTrackerRef.set({
          ipAddress: clientIp,
          usersMap,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const userList = Object.values(usersMap);

        // THRESHOLD: More than 2 distinct users on the same device/IP -> Trigger User Violation
        if (userList.length > 2) {
          const caseId = `CASE-UV-${safeIp.slice(0, 8)}-${userList.length}`;
          const uvRef = db.collection("user_violations").doc(caseId);
          await uvRef.set({
            caseId,
            deviceIp: clientIp,
            googleMapsUrl: googleMapsUrl,
            geolocation: `${city}, ${country}`,
            country: country,
            city: city,
            isp: isp,
            userCount: userList.length,
            users: userList,
            status: "Flagged",
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      res.json({ success: true, isSpoofedUa, googleMapsUrl });
    } else {
      res.json({ success: true });
    }
  } catch (err) {
    console.error("Device log endpoint error:", err);
    res.json({ success: false });
  }
});

// ==========================================
// ROUTES: AI VIOLATION & PUNISHMENT SUGGESTIONS
// ==========================================
app.post('/api/ai/violation-punishment', async (req, res) => {
  try {
    const { violationType, caseId, deviceIp, userCount, users, userId, offenseCount = 1 } = req.body;
    
    let prompt = "";
    if (violationType === "user_violation") {
      prompt = `Analyze security violation Case ID ${caseId}. Device IP ${deviceIp} has ${userCount} multi-account logins associated with it. Offense count: ${offenseCount}. Users involved: ${JSON.stringify(users)}.
Provide:
1. Risk Assessment & Severity
2. Recommended Account Suspension Duration (e.g. 1st Offense: 5 Days, 2nd Offense: 12 Days, 3rd Offense: 30 Days, 4th Offense: Permanent Ban)
3. Actionable Security Compliance Instructions for Admin.`;
    } else {
      prompt = `Analyze unauthorized access violation Case ID ${caseId}. User ${userId} on device IP ${deviceIp} attempted unauthorized Train Model operation. Offense count: ${offenseCount}.
Provide:
1. Violation Impact Summary
2. Recommended Penalty / Account Suspension Duration
3. Security Mitigation Steps for Admin.`;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const gRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          contents: [{ parts: [{ text: prompt }] }]
        }, { timeout: 8000 });

        const answer = gRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (answer) {
          return res.json({ success: true, suggestion: answer });
        }
      } catch (gErr) {}
    }

    // Default Rule-Based Punishment Calculation
    let duration = "5 Days Account Suspension";
    if (offenseCount === 2) duration = "12 Days Account Suspension";
    else if (offenseCount === 3) duration = "30 Days Account Suspension";
    else if (offenseCount >= 4) duration = "Permanent Account Termination";

    const defaultSuggestion = `### 🚨 DPGNotes AI Compliance & Security Assessment

- **Case ID**: ${caseId || 'N/A'}
- **Target IP**: ${deviceIp || 'Unknown'}
- **Offense Record**: Offense #${offenseCount}
- **Recommended Penalty**: **${duration}**

#### 🛡️ Compliance Analysis:
1. Multi-account multi-tenancy or unauthorized Train Model execution breaches DPGNotes DRASA Security Regulations.
2. Admins should review user logs and apply temporary suspension or mandatory re-authentication.`;

    res.json({ success: true, suggestion: defaultSuggestion });
  } catch (err) {
    res.json({ success: false, suggestion: "Failed to generate AI punishment recommendation." });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 min expiry
    
    await sendEmail(
      email, 
      "DPGNotes Admin Login OTP", 
      `<h3>Your OTP for Admin Login is: <span style="color:#2563eb">${otp}</span></h3>`
    );
    
    res.json({ message: "OTP sent to admin email" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post('/api/admin/verify', async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (record && record.otp === otp && record.expires > Date.now()) {
    otpStore.delete(email);
    try {
      // Generate JWT valid for 3 days
      const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '3d' });
      const firebaseToken = await admin.auth().createCustomToken(email, { admin: true });
      res.json({ token, firebaseToken, message: "Login successful" });
    } catch (error) {
      console.error("Custom token error:", error);
      res.status(500).json({ error: "Failed to authenticate with Firebase" });
    }
  } else {
    res.status(401).json({ error: "Invalid or expired OTP" });
  }
});

// Admin Middleware
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error();
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Delete activity log entries (single or batch)
app.post('/api/admin/delete-logs', verifyAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array is required" });
  }
  try {
    const batch = db.batch();
    ids.forEach(id => {
      const ref = db.collection("activity_logs").doc(id);
      batch.delete(ref);
    });
    await batch.commit();
    res.json({ message: `${ids.length} log(s) deleted` });
  } catch (err) {
    console.error("Log delete failed:", err);
    res.status(500).json({ error: "Failed to delete logs" });
  }
});

app.post('/api/admin/send-delete-key', verifyAdmin, async (req, res) => {
  const { contributorId, contributorEmail } = req.body;
  if (!contributorId) return res.status(400).json({ error: "Contributor ID required" });
  
  // Generate 16 digit alphanumeric key
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  otpStore.set(`delete_${contributorId}`, { key, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins
  
  await sendEmail(
    req.adminEmail,
    "Action Required: Confirm Contributor Deletion",
    `<h3>You requested to delete contributor: ${contributorEmail || contributorId}</h3>
     <p>This will permanently delete their account and all their uploaded documents.</p>
     <p>Your 16-character authorization key is:</p>
     <h2 style="color:#ef4444; letter-spacing: 2px;">${key}</h2>
     <p>This key expires in 10 minutes.</p>`
  );
  
  res.json({ message: "Key sent" });
});

app.post('/api/admin/delete-contributor', verifyAdmin, async (req, res) => {
  const { contributorId, key } = req.body;
  const record = otpStore.get(`delete_${contributorId}`);
  
  if (record && record.key === key && record.expires > Date.now()) {
    otpStore.delete(`delete_${contributorId}`);
    
    try {
      // 1. Delete all documents uploaded by this user
      const docsSnapshot = await db.collection("documents").where("userId", "==", contributorId).get();
      const batch = db.batch();
      docsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // 2. Delete user's profile from Firestore
      await db.collection("users").doc(contributorId).delete();
      
      // 3. Delete user from Firebase Auth
      try {
        await admin.auth().deleteUser(contributorId);
      } catch (authErr) {
        console.error("Auth deletion skipped (maybe not found in Auth):", authErr.message);
      }
      
      res.json({ message: "Contributor and all associated data permanently deleted." });
    } catch (err) {
      console.error("Deletion error:", err);
      res.status(500).json({ error: "Failed to delete contributor data" });
    }
  } else {
    res.status(401).json({ error: "Invalid or expired authorization key" });
  }
});

app.post('/api/admin/delete-share-code', verifyAdmin, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Share token required" });
  
  try {
    // 1. Fetch Share Link
    const linkQuery = await db.collection("share_links").where("token", "==", token).get();
    if (linkQuery.empty) return res.status(404).json({ error: "Share link not found" });
    
    const linkDoc = linkQuery.docs[0];
    const linkData = linkDoc.data();
    const uploaderUid = linkData.uploaderUid || linkData.userId;
    const resourceTitle = linkData.title || "Untitled Resource";
    
    // 2. Fetch generator/uploader email
    let uploaderEmail = "";
    if (uploaderUid) {
      const uploaderDoc = await db.collection("users").doc(uploaderUid).get();
      if (uploaderDoc.exists) uploaderEmail = uploaderDoc.data().email;
    }
    
    // 3. Fetch engagements & visitor emails
    const engagements = await db.collection("share_engagements").where("shareToken", "==", token).get();
    const visitorUids = [...new Set(engagements.docs.map(d => d.data().openedBy).filter(e => e && e !== uploaderUid))];
    
    const visitorEmails = [];
    for (const vUid of visitorUids) {
      const vDoc = await db.collection("users").doc(vUid).get();
      if (vDoc.exists && vDoc.data().email) {
        visitorEmails.push(vDoc.data().email);
      }
    }
    
    // 4. Send email notifications
    if (uploaderEmail) {
      const htmlGen = createTemplate("Share Code Terminated ⚠️", `<p>Your generated share code <strong>${token}</strong> for <strong>"${resourceTitle}"</strong> has been terminated/deleted by an Administrator.</p>`);
      await sendEmail(uploaderEmail, "Notice: Terminated Share Link", htmlGen).catch(e => console.error(e));
    }
    
    for (const visitorEmail of visitorEmails) {
      const htmlVis = createTemplate("Resource Access Terminated ⚠️", `<p>A DPGNotes share link for <strong>"${resourceTitle}"</strong> (Code: <strong>${token}</strong>) that you visited has been deleted by an Administrator.</p>`);
      await sendEmail(visitorEmail, "Notice: Share Link Deleted", htmlVis).catch(e => console.error(e));
    }
    
    // 5. Delete from DB
    const batch = db.batch();
    batch.delete(linkDoc.ref);
    engagements.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    res.json({ message: "Share link and engagements deleted successfully. Notifications sent." });
  } catch (err) {
    console.error("Failed to delete share link:", err);
    res.status(500).json({ error: "Server error deleting share link" });
  }
});

app.post('/api/contributor/delete-account', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken required" });
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // 1. Delete all documents uploaded by this user
    const docsSnapshot = await db.collection("documents").where("userId", "==", uid).get();
    const batch = db.batch();
    docsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // 2. Delete user's profile from Firestore
    await db.collection("users").doc(uid).delete();
    
    // 3. Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);
    
    res.json({ message: "Account successfully deleted." });
  } catch (err) {
    console.error("Account self-deletion error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ==========================================
// SHARE LINK ENGINE & CTR TRACKING
// ==========================================

// Helper to generate random string
function generateShortToken(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for(let i=0; i<length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

app.post('/api/share/generate', async (req, res) => {
  const { docId, title, category, discipline, uploader, pdfUrl, description, tags, originalUrl, uploaderUid } = req.body;
  
  if (!docId) return res.status(400).json({ error: "Document ID required" });

  try {
    const token = generateShortToken();
    
    // Store in Firestore
    await db.collection("share_links").doc(token).set({
      token,
      docId,
      title,
      category,
      discipline,
      uploader,
      uploaderUid: uploaderUid || "",
      pdfUrl,
      description,
      tags: tags || "",
      originalUrl: originalUrl || "",
      clicks: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also track total shares on the document itself for quick ranking
    const docRef = db.collection("documents").doc(docId);
    await docRef.update({
      shareCount: admin.firestore.FieldValue.increment(1)
    }).catch(err => console.log("Virtual or missing doc, skipping shareCount increment: " + err.message));

    const baseUrl = (originalUrl && originalUrl.trim()) 
      ? originalUrl.trim().replace(/\?share=$/, '') 
      : 'https://dpgnotes.web.app/index.html';
    const shareUrl = `${baseUrl}?share=${token}`;
    res.json({ token, shareUrl });
  } catch (error) {
    console.error("Failed to generate share link:", error);
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

app.get('/api/share/click', async (req, res) => {
  const { token, openedBy } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });

  try {
    const shareQuery = await db.collection("share_links").where("token", "==", token).get();
    if (shareQuery.empty) {
      return res.status(404).json({ error: "Share link not found or expired" });
    }
    
    const docSnap = shareQuery.docs[0];
    const data = docSnap.data();
    const shareRef = docSnap.ref;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Unknown";
    const userAgent = req.headers['user-agent'] || "Unknown";
    
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    const recentClicksSnap = await db.collection("share_engagements")
      .where("shareToken", "==", token)
      .get();
      
    let status = "Usual";
    let clickCount = 0;
    recentClicksSnap.forEach(doc => {
      const eng = doc.data();
      if (eng.ipAddress === ipAddress) {
        const ts = eng.timestamp ? (eng.timestamp.toMillis ? eng.timestamp.toMillis() : (eng.timestamp._seconds * 1000 || eng.timestamp.seconds * 1000)) : 0;
        if (ts >= fiveMinsAgo) {
          clickCount++;
        }
      }
    });
    
    if (clickCount >= 3) {
      status = "Unusual";
    }

    // Log engagement detail
    await db.collection("share_engagements").add({
      shareToken: token,
      openedBy: openedBy || "Guest",
      ipAddress,
      userAgent,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Increment clicks on the share link
    await shareRef.update({
      clicks: admin.firestore.FieldValue.increment(1)
    });
    
    // Increment CTR on the actual document for ranking
    if (data.docId) {
      const docRef = db.collection("documents").doc(data.docId);
      await docRef.update({
        ctrCount: admin.firestore.FieldValue.increment(1)
      }).catch(e => console.error("Document not found for CTR tracking", e));
    }

    res.json({ documentData: data });
  } catch (error) {
    console.error("CTR tracking error:", error);
    res.status(500).json({ error: "Failed to process share link" });
  }
});

// Admin share report secure endpoint
app.get('/api/admin/share-report/:token', verifyAdmin, async (req, res) => {
  try {
    const token = req.params.token;
    
    // Fetch Share Link Info
    const shareQuery = await db.collection('share_links').where('token', '==', token).get();
    if (shareQuery.empty) return res.status(404).json({ error: "Share link not found" });
    const shareDoc = shareQuery.docs[0].data();
    
    // Fetch Engagements
    const engQuery = await db.collection('share_engagements')
      .where('shareToken', '==', token)
      .get();
      
    const engagements = [];
    engQuery.forEach(doc => {
      const engData = doc.data();
      if (engData.timestamp) {
        engData.timestamp = { _seconds: engData.timestamp.seconds };
      }
      engagements.push(engData);
    });
    
    // Sort in memory to avoid index requirements
    engagements.sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp._seconds : 0;
      const bTime = b.timestamp ? b.timestamp._seconds : 0;
      return bTime - aTime;
    });
    
    res.json({
      shareInfo: shareDoc,
      engagements: engagements
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load report" });
  }
});

// ==========================================
// BEAUTIFUL EMAIL TEMPLATES
// ==========================================
const createTemplate = (title, message) => `
<div style="font-family: 'Inter', sans-serif; background: #0f172a; padding: 40px 20px; color: #fff;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">DPGNotes</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin-top: 0; color: #f8fafc; font-size: 20px;">${title}</h2>
      <div style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
        ${message}
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 20px 0;">
        <span style="font-size: 11px; color: #64748b; display: block; line-height: 1.4;">
          <strong>Legal & Compliance Notice:</strong> This activity is tracked, validated, and logged in our secure audit trails under our Tracking & Analytics Policy. Contributor profiles, uploads, suspensions, and access privileges are governed strictly in accordance with DPGNotes Regulations & Suspension Act (DRASA) and general Terms & Conditions.
        </span>
      </div>
      <div style="margin-top: 40px; text-align: center;">
        <a href="https://dpgnotes.web.app/dashboard.html" style="background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </div>
    </div>
    <div style="background: #0f172a; padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); line-height: 1.6;">
      <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Akshat Network Hub. All rights reserved.</p>
      <p style="margin: 0;">
        <a href="https://dpgnotes.web.app/legal/index.html#privacy" style="color: #64748b; text-decoration: underline; margin: 0 5px;">Privacy Policy</a> | 
        <a href="https://dpgnotes.web.app/legal/index.html#terms" style="color: #64748b; text-decoration: underline; margin: 0 5px;">Terms & Conditions</a> | 
        <a href="https://dpgnotes.web.app/legal/index.html#drasa" style="color: #64748b; text-decoration: underline; margin: 0 5px;">DRASA Regulations</a>
      </p>
    </div>
  </div>
</div>
`;

// ==========================================
// ROUTES: EMAIL HOOKS (Frontend calls these)
// ==========================================

// Helper: Write in-app notification to Firestore
async function createInAppNotification(email, title, message, type = 'system', dedupKey = null) {
  if (!email) return;
  try {
    // If dedupKey provided, check for existing unread notification to avoid duplicates
    if (dedupKey) {
      const existing = await db.collection('notifications')
        .where('email', '==', email)
        .where('dedupKey', '==', dedupKey)
        .limit(1).get();
      if (!existing.empty) return; // Already notified
    }
    await db.collection('notifications').add({
      email,
      title,
      message,
      type,
      isRead: false,
      dedupKey: dedupKey || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('createInAppNotification failed:', e.message);
  }
}

// 1. Welcome New Contributor
app.post('/api/email/welcome', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Welcome to DPGNotes! 🎉", `<p>Hi <strong>${name}</strong>,</p><p>We are thrilled to have you join our contributor community. Your knowledge will help thousands of students succeed.</p>`);
  await sendEmail(email, "Welcome to DPGNotes!", html);
  await createInAppNotification(email, "Welcome to DPGNotes! 🎉", `Hi ${name}, we're thrilled to have you! Your knowledge will help thousands of students.`, "success");
  res.json({ message: "Sent" });
});

// 2. Honour on first Contribution
app.post('/api/email/first-contribution', async (req, res) => {
  const { email, title } = req.body;
  const html = createTemplate("First Contribution Honour! 🏅", `<p>Congratulations on uploading your very first resource: <strong>${title}</strong>.</p><p>You are officially a DPGNotes Contributor!</p>`);
  await sendEmail(email, "Your First Contribution!", html);
  await createInAppNotification(email, "First Contribution Honour! 🏅", `Congratulations! You uploaded your first resource: "${title}". You are officially a DPGNotes Contributor!`, "milestone");
  res.json({ message: "Sent" });
});

// ==========================================
// HIGH-LEVEL SECURITY & TELEMETRY ENGINE
// ==========================================


// 3. Honours on Reaching 30+ likes
app.post('/api/email/thirty-likes', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Community Favorite! 💎", `<p>Incredible work, <strong>${name}</strong>!</p><p>Your resources have accumulated over <strong>30 likes</strong>. The community truly appreciates your high-quality materials.</p>`);
  await sendEmail(email, "30+ Likes Milestone Reached!", html);
  res.json({ message: "Sent" });
});

// 4. Honours on Reaching 15+ Shares
app.post('/api/email/fifteen-shares', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Viral Contributor! 🚀", `<p>Amazing, <strong>${name}</strong>!</p><p>Your resources have been shared over <strong>15 times</strong> across the web. You are making a massive impact!</p>`);
  await sendEmail(email, "15+ Shares Milestone Reached!", html);
  res.json({ message: "Sent" });
});

// 4.1 Honours on Reaching 70+ likes
app.post('/api/email/seventy-likes', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Elite Contributor Milestone! 🏆", `<p>Incredible work, <strong>${name}</strong>!</p><p>Your resources have accumulated over <strong>70 likes</strong>. You have reached elite status in our community!</p>`);
  await sendEmail(email, "70+ Likes Milestone Reached!", html);
  res.json({ message: "Sent" });
});

// 4.2 Honours on Reaching 10 Shares Generated
app.post('/api/email/ten-shares-generation', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Word Spreader Honour! 📣", `<p>Thank you, <strong>${name}</strong>!</p><p>You have generated <strong>10 short share links</strong> for DPGNotes resources. Thank you for spreading the word and growing our community!</p>`);
  await sendEmail(email, "10 Share Links Generated Honour!", html);
  res.json({ message: "Sent" });
});

// 4.3 Useful Resource Upload Honour Email
app.post('/api/email/useful-resource-honour', async (req, res) => {
  const { email, name, resourceTitle, likesCount, sharesCount } = req.body;
  const html = createTemplate("Useful Resource Honour! 🌟", `<p>Congratulations <strong>${name}</strong>!</p><p>Your uploaded resource <strong>"${resourceTitle}"</strong> has been declared <strong>Highly Useful</strong> by the community!</p><p>It has received <strong>${likesCount} likes</strong> and <strong>${sharesCount} shares</strong>.</p><p>Thank you for contributing highly valuable content!</p>`);
  await sendEmail(email, "Useful Resource Milestone Reached!", html);
  res.json({ message: "Sent" });
});

// 5. New Resource Alert (Followers)
app.post('/api/email/new-resource', async (req, res) => {
  const { followerEmails, authorName, resourceTitle } = req.body;
  // followerEmails is an array of emails
  const html = createTemplate("New Resource Alert 📚", `<p><strong>${authorName}</strong> just uploaded a new resource:</p><p style="font-size: 18px; color: #60a5fa; font-weight: bold;">${resourceTitle}</p><p>Check it out before your next exam!</p>`);
  
  // Send to all followers
  for (const email of followerEmails) {
    await sendEmail(email, `${authorName} uploaded a new resource!`, html);
  }
  res.json({ message: "Sent" });
});

// 6. Like Notification
app.post('/api/email/like-notification', async (req, res) => {
  const { email, resourceTitle, likerName } = req.body;
  const html = createTemplate("Someone loved your resource! ❤️", `<p><strong>${likerName}</strong> just liked your document:</p><p style="font-size: 18px; color: #f43f5e; font-weight: bold;">${resourceTitle}</p>`);
  await sendEmail(email, "New Like on your Resource", html);
  await createInAppNotification(email, "New Like ❤️", `${likerName} liked your document: ${resourceTitle}`, "like");
  res.json({ message: "Sent" });
});

// 7. Admin Delete
app.post('/api/email/admin-delete', async (req, res) => {
  const { email, resourceTitle, reason } = req.body;
  const html = createTemplate("Resource Removed ⚠️", `<p>Your resource <strong>${resourceTitle}</strong> was removed by the moderation team.</p><p><strong>Reason:</strong> ${reason}</p><p>Please ensure future uploads comply with our community guidelines.</p>`);
  await sendEmail(email, "Notice: Resource Removed", html);
  await createInAppNotification(email, "Resource Removed ⚠️", `Your resource ${resourceTitle} was removed. Reason: ${reason}`, "alert");
  res.json({ message: "Sent" });
});

// 7.5 Contributor Delete
app.post('/api/email/contributor-delete', async (req, res) => {
  const { docTitle, contributorName, reason, likerUids } = req.body;
  
  // A. Notify Likers
  if (likerUids && likerUids.length > 0) {
    try {
      const usersRes = await axios.get('https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/users?pageSize=1000');
      const usersDocs = usersRes.data.documents || [];
      
      const likerEmails = usersDocs
        .filter(d => {
           const uid = d.name.split('/').pop();
           return likerUids.includes(uid);
        })
        .map(d => d.fields.email?.stringValue)
        .filter(Boolean);
        
      const htmlLiker = createTemplate("Resource Removed 🗑️", `<p>The resource <strong>${docTitle}</strong> that you liked has been removed by its author (<strong>${contributorName}</strong>).</p><p><strong>Reason:</strong> ${reason}</p>`);
      
      for (const email of likerEmails) {
        await sendEmail(email, "A resource you liked was removed", htmlLiker);
      }
    } catch (e) {
      console.error("Failed to notify likers:", e.message);
    }
  }
  
  // B. Notify Admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const htmlAdmin = createTemplate("Resource Removed by Contributor ℹ️", `<p>Contributor <strong>${contributorName}</strong> has deleted their resource: <strong>${docTitle}</strong>.</p><p><strong>Reason provided:</strong> ${reason}</p>`);
    await sendEmail(adminEmail, "Contributor deleted a resource", htmlAdmin);
  }
  
  res.json({ message: "Sent" });
});

// 8. Admin Block
app.post('/api/email/admin-block', async (req, res) => {
  const { email, reason } = req.body;
  const html = createTemplate("Account Suspended 🚫", `<p>Your DPGNotes account has been suspended.</p><p><strong>Reason:</strong> ${reason}</p><p>If you believe this is an error, please contact support.</p>`);
  await sendEmail(email, "Notice: Account Suspended", html);
  res.json({ message: "Sent" });
});

// 9. Contribution Email (Standard)
app.post('/api/upload/notify', async (req, res) => {
  const { email, title } = req.body;
  const html = createTemplate("Upload Successful! ✅", `<p>Your resource <strong>${title}</strong> has been successfully published to DPGNotes.</p><p>Thank you for contributing!</p>`);
  await sendEmail(email, "Resource Published Successfully", html);
  res.json({ message: "Sent" });
});

// Replace Admin OTP Email
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 min expiry
    
    const html = createTemplate("Admin Authentication 🔒", `<p>Your secure One-Time Password for the Admin Dashboard is:</p><h2 style="font-size: 32px; letter-spacing: 5px; color: #3b82f6; text-align: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">${otp}</h2><p>This code expires in 5 minutes.</p>`);
    await sendEmail(email, "DPGNotes Admin OTP", html);
    
    res.json({ message: "OTP sent to admin email" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// ==========================================
// HIGH-LEVEL SECURITY & TELEMETRY ENGINE
// ==========================================

const pdfFileMapping = {
  analytics: 'DOC_ANH_06_2026_001_DOC_ANH_06_2026_001_20260714_130156.pdf',
  cookies: 'DOC_ANH_06_2026_002_DOC_ANH_06_2026_002_20260714_130555.pdf',
  copyright: 'DOC_ANH_06_2026_003_DOC_ANH_06_2026_003_20260714_130927.pdf',
  disclaimer: 'DOC_ANH_06_2026_004_DOC_ANH_06_2026_004_20260714_131118.pdf',
  dmca: 'DOC_ANH_06_2026_005_DOC_ANH_06_2026_005_20260714_131342.pdf',
  faq: 'DOC_ANH_06_2026_006_DOC_ANH_06_2026_006_20260714_131844.pdf',
  privacy: 'DOC_ANH_06_2026_007_DOC_ANH_06_2026_007_20260714_132144.pdf',
  retention: 'DOC_ANH_06_2026_008_DOC_ANH_06_2026_008_20260714_132349.pdf',
  security: 'DOC_ANH_06_2026_009_DOC_ANH_06_2026_009_20260714_132558.pdf',
  terms: 'DOC_ANH_06_2026_010_DOC_ANH_06_2026_010_20260714_132730.pdf',
  drasa: 'DOC_ANH_06_2026_011_DOC_ANH_06_2026_010_20260714_140930.pdf'
};

async function watermarkPdf(filePath, watermarkText) {
  const existingPdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, 20);
    const textHeight = 20;

    // Single centered watermark on the page
    page.drawText(watermarkText, {
      x: (width - textWidth) / 2 + 50,
      y: (height - textHeight) / 2 - 50,
      size: 20,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.12,
      rotate: degrees(45)
    });
  }

  // Stamp disclaimer on last page: Subject to Copyright in exactly 10 words
  const lastPage = pages[pages.length - 1];
  lastPage.drawText("Subject to copyright: Unauthorized replication of this material is prohibited.", {
    x: 50,
    y: 25,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
    opacity: 0.8
  });

  return await pdfDoc.save();
}

const verifySession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: 'contributor'
    };
    return next();
  } catch (err) {
    try {
      const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        email: decodedAdmin.email,
        role: 'admin'
      };
      return next();
    } catch (adminErr) {
      return res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
    }
  }
};



const secureDocsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: { error: "Too many document requests from this device. Please wait 5 minutes." },
  handler: async (req, res, next, options) => {
    const authHeader = req.headers.authorization;
    let userId = 'Guest';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch (e) {}
    }
    
    await db.collection("security_violations").add({
      userId,
      reason: "Suspicious Activity: Rate Limit Exceeded (Rapid consecutive document requests)",
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(options.statusCode).send(options.message);
  }
});

app.get('/api/legal/document/:section', secureDocsLimiter, async (req, res) => {
  const { section } = req.params;
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const authHeader = req.headers.authorization;
  
  let watermarkVal = '';
  let isGuest = true;

  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split('Bearer ')[1] : req.query.token;
  if (token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const sessionSnap = await db.collection("active_sessions").doc(decodedToken.uid).get();
      if (sessionSnap.exists) {
        const sessions = sessionSnap.data().sessions || [];
        if (sessions.some(s => s.sessionId === sessionId)) {
          const name = decodedToken.name || decodedToken.email.split('@')[0];
          watermarkVal = `${name}-${decodedToken.uid}`;
          isGuest = false;
        }
      }
    } catch (err) {
      try {
        const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET);
        const adminId = `admin_${decodedAdmin.email.replace(/[@.]/g, '_')}`;
        const sessionSnap = await db.collection("active_sessions").doc(adminId).get();
        if (sessionSnap.exists) {
          const sessions = sessionSnap.data().sessions || [];
          if (sessions.some(s => s.sessionId === sessionId)) {
            // For admin, use current login timestamp
            const loginTime = new Date().toLocaleString();
            watermarkVal = `Admin-${loginTime}`;
            isGuest = false;
          }
        }
      } catch (adminErr) {}
    }
  }

  if (isGuest) {
    const guestId = req.headers['x-guest-id'] || req.query.guestId || 'GST-UNKNOWN';
    watermarkVal = `Guest-${guestId}`;
  }

  const pdfName = pdfFileMapping[section];
  if (!pdfName) {
    return res.status(404).json({ error: "Document not found" });
  }

  const filePath = path.join(__dirname, 'public/legal/docs', pdfName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Physical PDF file not found" });
  }

  try {
    const watermarkedBuffer = await watermarkPdf(filePath, watermarkVal);
    res.contentType("application/pdf");
    res.send(Buffer.from(watermarkedBuffer));
  } catch (err) {
    console.error("Watermarking stream failed:", err);
    res.status(500).json({ error: "Failed to load document stream" });
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-pro-latest'
];

async function askGemini(promptText) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Attempting Gemini query with model: ${model}`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Model ${model} returned non-ok status: ${res.status}`, errText);
        throw new Error(`Gemini status ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        console.warn(`Model ${model} returned error payload:`, data.error);
        throw new Error(`Gemini API error: ${data.error.message}`);
      }
      const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (outputText) {
        return outputText;
      }
      throw new Error("Empty candidate response format");
    } catch (err) {
      console.warn(`Model ${model} failed: ${err.message}. Retrying fallback...`);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed");
}

async function scanDuplicateProfiles() {
  console.log("Starting DPGNotes AI Duplicate Profile Scan...");
  try {
    const usersSnap = await db.collection("users").get();
    const usersList = [];
    usersSnap.forEach(docSnap => {
      const u = docSnap.data();
      u.id = docSnap.id;
      usersList.push({
        id: u.id,
        name: u.name || "",
        email: u.email || "",
        bio: u.bio || "",
        phone: u.phone || "",
        role: u.role || "contributor"
      });
    });

    if (usersList.length < 2) return;

    const prompt = `You are a security intelligence analyzer. Review this list of users registered on DPGNotes. Identify any different user accounts (different emails) that seem to belong to the SAME actual person based on their name, bio, phone numbers, or profile characteristics.
    Return the response as a JSON array of objects. Each object representing a detected duplicate group must be formatted exactly as:
    {
      "reason": "Clear explanation of why they match",
      "emails": ["email1@domain.com", "email2@domain.com"],
      "userIds": ["uid1", "uid2"]
    }
    If no duplicates are found, return: []
    Users list:
    ${JSON.stringify(usersList)}
    Return ONLY the raw valid JSON list. No markdown formatting, no backticks, no comments.`;

    const aiRes = await askGemini(prompt);
    let duplicates = [];
    try {
      const cleanJsonText = aiRes.replace(/```json/g, "").replace(/```/g, "").trim();
      duplicates = JSON.parse(cleanJsonText);
    } catch (e) {
      console.error("Failed to parse Gemini duplicate profiles response:", aiRes);
    }

    if (Array.isArray(duplicates) && duplicates.length > 0) {
      for (const dup of duplicates) {
        console.warn(`[AI WARN] Duplicate accounts found: ${dup.emails.join(", ")}`);
        
        // Yellow flag all matching userids
        for (const uid of dup.userIds) {
          await db.collection("users").doc(uid).set({
            isYellowFlagged: true,
            yellowFlagReason: `System Auto-Flag: AI Duplicate Detection Match (${dup.reason})`
          }, { merge: true });
        }

        // Add warning notifications for each matching contributor
        const title = "Potential Duplicate Identity Alert ⚠️";
        const message = `AI system flagged user profiles matching under multiple email addresses: ${dup.emails.join(", ")}. Reason: ${dup.reason}`;
        
        for (const email of dup.emails) {
          await db.collection("notifications").add({
            email: email,
            title,
            message,
            type: "warning",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  } catch (err) {
    console.error("Duplicate profiles scan failed:", err);
  }
}

// Public Legal Center AI Q&A — no auth required
app.post('/api/ai/legal-query', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ error: "A valid question is required" });
  }
  try {
    const prompt = `You are DPGNotes Legal Intelligence, an AI assistant for the DPGNotes Academic Portal legal center. 
Use the following official training documentation as your source of truth to answer the question:

${trainingData}

Answer the following question in clear, user-friendly language about DPGNotes policies, privacy, terms, data handling, copyright, or DRASA regulations. 
If the question is completely unrelated to legal/compliance/DPGNotes platform, politely decline and redirect.
Format your response in proper markdown with headers, bullet points, and bold key terms where helpful.

Question: ${question.trim()}`;
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error("Legal AI query failed:", err);
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});

// Public Document Analysis AI — no auth required (Used by PDF Viewer)
app.post('/api/ai/analyse-document', async (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({ error: "document data is required" });
  }
  try {
    // 1. Compulsory AI Screening for document quality and compliance
    const screenPrompt = `You are a compliance AI content screening manager. Review the following uploaded document metadata for compliance violations (e.g. extreme copyright infringement indicators, personal identifiable info (PII) leakage, hate speech, or non-educational content).
    Document Info:
    Title: ${data.title}
    Category: ${data.category}
    Discipline: ${data.discipline}
    Description: ${data.description || 'N/A'}
    Tags: ${data.tags || 'N/A'}
    
    Return a JSON object formatted exactly as:
    {
      "decision": "approve" or "reject",
      "reason": "Clear explanation of the decision"
    }
    Return ONLY raw valid JSON text, no markdown backticks, no comments.`;
    
    const screenRes = await askGemini(screenPrompt);
    const cleanJson = screenRes.replace(/```json/g, "").replace(/```/g, "").trim();
    let decisionObj;
    try {
      decisionObj = JSON.parse(cleanJson);
    } catch(pe) {
      decisionObj = { decision: "approve", reason: "Parsing error" };
    }
    
    if (decisionObj.decision === 'reject') {
      return res.status(400).json({ error: `Document failed compliance screening: ${decisionObj.reason}` });
    }

    // 2. Proceed with Analysis
    const prompt = `You are DPGNotes Intelligence, an advanced AI tutor and document analyzer for students.
Analyze the following document metadata and provide a comprehensive, structured summary and key insights that a student would find highly useful.
Format your response in GitHub Flavored Markdown, using headers, bullet points, bold text for emphasis, and clear sections.

Document Info:
Title: ${data.title}
Category: ${data.category}
Discipline: ${data.discipline}
Description: ${data.description || 'N/A'}
Tags: ${data.tags || 'N/A'}

Provide:
1. A brief overview of what this document likely covers based on its metadata.
2. The target audience (e.g., which semester or course).
3. 3-4 key learning objectives or topics expected to be found inside.
4. A concluding encouraging remark for the student.`;

    const answer = await askGemini(prompt);
    res.json({ analysis: answer });
  } catch (err) {
    console.error("Document AI analysis failed:", err);
    res.status(500).json({ error: "AI analysis temporarily unavailable", details: err.message, stack: err.stack });
  }
});

// Conversational AI Chat — public (Used by PDF Viewer, Legal Center, and Report.html)
app.post('/api/ai/chat', async (req, res) => {
  const { history, question, context } = req.body;
  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }
  try {
    // Detect if this is a legal center query or legal-related question
    const isLegal = (context && context.pageContext && context.pageContext.includes("Legal")) || 
                    (question.toLowerCase().includes("legal")) || 
                    (question.toLowerCase().includes("policy")) || 
                    (question.toLowerCase().includes("copyright")) || 
                    (question.toLowerCase().includes("dmca")) ||
                    (question.toLowerCase().includes("terms")) ||
                    (question.toLowerCase().includes("privacy"));

    let contextString = context ? JSON.stringify(context, null, 2) : "N/A";
    if (isLegal) {
      contextString += `\n\nOfficial DPGNotes Legal and Operational Training Dataset (Use this as your source of truth to answer accurately):\n${trainingData}`;
    }

    const prompt = `You are DPGNotes Intelligence, an advanced and friendly AI assistant.
Answer the student's question clearly. Focus on accuracy, readability, and modern markdown formatting.

Context Details:
${contextString}

Conversation History:
${(history || []).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')}

New Question: ${question}

Provide a direct and comprehensive answer.`;

    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error("AI chat failed:", err);
    res.status(500).json({ error: "AI chat service temporarily unavailable", details: err.message });
  }
});

// Profile AI Assistant conversational query route
app.post('/api/ai/query', async (req, res) => {
  const { userId, userEmail, userMessage } = req.body;
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return res.status(400).json({ error: "A valid userMessage parameter is required" });
  }
  try {
    const docsSnapshot = await db.collection("documents").get();
    const docSummary = [];
    docsSnapshot.forEach(d => {
      const data = d.data();
      docSummary.push(`- "${data.title}" (${data.category} / ${data.discipline}) shared by ${data.userName || 'Contributor'}`);
    });
    const docContext = docSummary.length > 0 ? docSummary.slice(0, 30).join("\n") : "No documents uploaded yet.";

    const prompt = `You are DPGNotes Intelligence, an advanced AI tutor, study assistant, and DPGNotes platform expert.
You have access to the actual resources and documents shared by contributors on DPGNotes. 

Here is the current catalog of shared study resources/notes on the platform:
${docContext}

Answer the student's question. If their question is about finding notes, study material, or recommendations, suggest the relevant DPGNotes resources from the catalog above. Focus on accuracy, readability, and modern markdown formatting.

Question: ${userMessage.trim()}`;

    const response = await askGemini(prompt);
    res.json({ response });
  } catch (err) {
    console.error("Profile AI query failed:", err);
    res.status(500).json({ error: "AI service temporarily unavailable", details: err.message });
  }
});

app.post('/api/ai/screen', verifySession, async (req, res) => {
  const { type, data } = req.body;
  if (!type || !data) {
    return res.status(400).json({ error: "type and data parameters are required" });
  }

  try {
    if (type === 'document') {
      const prompt = `You are a compliance AI content screening manager. Review the following uploaded document metadata for compliance violations (e.g. extreme copyright infringement indicators, personal identifiable info (PII) leakage, hate speech, or non-educational content).
      Document: ${JSON.stringify(data)}
      Return a JSON object formatted exactly as:
      {
        "decision": "approve" or "reject",
        "reason": "Clear explanation of the decision"
      }
      Return ONLY raw valid JSON text, no markdown backticks, no comments.`;
      const aiRes = await askGemini(prompt);
      const cleanJson = aiRes.replace(/```json/g, "").replace(/```/g, "").trim();
      const decisionObj = JSON.parse(cleanJson);

      if (decisionObj.decision === 'reject') {
        // Log notification to this user
        await db.collection("notifications").add({
          email: req.user.email || 'N/A',
          title: "Upload Rejected 🚫",
          message: `Your document upload was rejected by DPGNotes AI Compliance: ${decisionObj.reason}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return res.json(decisionObj);
    } 
    
    if (type === 'profile') {
      const prompt = `You are a professional profile reviewer. Check this updated user profile input for profanity, malicious code inputs, or extreme unprofessional text.
      Profile Data: ${JSON.stringify(data)}
      Return a JSON object formatted exactly as:
      {
        "decision": "approve" or "reject",
        "reason": "Clear explanation of the decision"
      }
      Return ONLY raw JSON, no markdown backticks.`;
      const aiRes = await askGemini(prompt);
      const cleanJson = aiRes.replace(/```json/g, "").replace(/```/g, "").trim();
      const decisionObj = JSON.parse(cleanJson);
      
      if (decisionObj.decision === 'reject') {
        // Log notification
        await db.collection("notifications").add({
          email: req.user.email || 'N/A',
          title: "Profile Update Blocked ⚠️",
          message: `Your profile change request was blocked by DPGNotes AI Quality Assurance: ${decisionObj.reason}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return res.json(decisionObj);
    }

    if (type === 'login') {
      const prompt = `You are an AI anomaly detector. Review the following registration/login request metadata for potential bot registration, credential stuffing, or email domain scams.
      Request: ${JSON.stringify(data)}
      Return a JSON object formatted exactly as:
      {
        "decision": "approve" or "reject",
        "reason": "Clear explanation of the decision"
      }
      Return ONLY raw JSON.`;
      const aiRes = await askGemini(prompt);
      const cleanJson = aiRes.replace(/```json/g, "").replace(/```/g, "").trim();
      return res.json(JSON.parse(cleanJson));
    }

    if (type === 'report') {
      const prompt = `You are DPGNotes compliance analyst. Review the following report log details and provide a professional markdown compliance assessment. Summarize potential risks, user behavior, and security indicators.
      Log Details: ${JSON.stringify(data)}
      Return a clear markdown report directly.`;
      const reportText = await askGemini(prompt);
      return res.json({ report: reportText });
    }

    res.status(400).json({ error: "Unsupported screening type" });
  } catch (err) {
    console.error("AI screening failed:", err);
    res.status(500).json({ error: "AI screening service error" });
  }
});

// ==========================================
// REFERRER & INVITATION SYSTEM API
// ==========================================

app.post('/api/invite/send', async (req, res) => {
  const { senderId, senderName, senderEmail, toEmail, toName, message } = req.body;
  if (!senderId || !senderEmail || !toEmail || !toName) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const referrerCode = "DPG" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const inviteRef = await db.collection("invitations").add({
      senderId,
      senderName,
      senderEmail,
      toEmail,
      toName,
      message: message || '',
      token,
      referrerCode,
      status: "Verification Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: senderName
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const backendBaseUrl = `${protocol}://${host}`;
    const verifyLink = `${backendBaseUrl}/api/invite/verify?token=${token}`;
    const htmlContent = `
      <div style="font-family:Arial,sans-serif; padding:20px; background:#f4f4f5; color:#1e293b;">
        <div style="max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:12px; border:1px solid #e2e8f0;">
          <h2 style="color:#6366f1;">DPGNotes Security: Verify Invitation</h2>
          <p>Hi ${senderName},</p>
          <p>You requested to send an invitation to <strong>${toName}</strong> (${toEmail}) to join the DPGNotes community.</p>
          <p>To confirm that this is you, please click the button below to dispatch the invitation:</p>
          <div style="text-align:center; margin:30px 0;">
            <a href="${verifyLink}" style="background:#10b981; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Verify and Dispatch Invitation</a>
          </div>
          <p style="font-size:0.85em; color:#64748b;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail(senderEmail, `Verify Your Invitation to ${toName}`, htmlContent);
    res.json({ success: true, message: "Verification email sent to sender." });
  } catch (err) {
    console.error("Invite send error:", err);
    res.status(500).json({ error: "Failed to send invitation verification." });
  }
});

app.get('/api/invite/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid token.");

  try {
    const snapshot = await db.collection("invitations").where("token", "==", token).limit(1).get();
    if (snapshot.empty) return res.status(404).send("Invitation not found or expired.");

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    if (invite.status !== "Verification Pending") {
      return res.send("This invitation has already been verified.");
    }

    // Update status to Receive (meaning Mail Received by receiver)
    await inviteDoc.ref.update({
      status: "Receive",
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send email to the receiver
    const frontendBaseUrl = process.env.APP_URL || 'https://dpgnotes.web.app';
    const inviteLink = `${frontendBaseUrl}/?referrer=${invite.referrerCode}`;
    const receiverHtml = `
      <div style="font-family:Arial,sans-serif; padding:20px; background:#f8fafc; color:#0f172a;">
        <div style="max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:12px; border-top:6px solid #6366f1; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="text-align:center; margin-bottom:20px;">
            <h1 style="color:#6366f1; margin:0;">DPGNotes</h1>
            <p style="color:#64748b; font-size:1.1rem; margin-top:5px;">Contributor Community</p>
          </div>
          
          <h2 style="font-size:1.4rem;">You're Invited!</h2>
          <p>Hi ${invite.toName},</p>
          <p><strong>${invite.senderName}</strong> (${invite.senderEmail}) has invited you to join the DPGNotes community as a Contributor.</p>
          
          ${invite.message ? `<div style="background:#f1f5f9; padding:15px; border-left:4px solid #94a3b8; font-style:italic; border-radius:0 8px 8px 0; margin:20px 0;">"${invite.message}"</div>` : ''}
          
          <h3>What is DPGNotes?</h3>
          <p>DPGNotes is an advanced platform for students and educators to share, analyze, and discuss academic materials. As a contributor, you can upload PDFs, engage with the AI Assistant, network with peers, and track your global analytics.</p>
          
          <div style="background:#fef3c7; border:1px solid #fde68a; padding:15px; border-radius:8px; margin:25px 0;">
            <h4 style="margin-top:0; color:#d97706;">Start Up Guide</h4>
            <ul style="margin-bottom:0; padding-left:20px; color:#92400e;">
              <li>Click the button below to visit DPGNotes.</li>
              <li>Sign in using your Google Account.</li>
              <li>Complete your profile setup to activate your dashboard.</li>
            </ul>
          </div>

          <div style="text-align:center; margin:35px 0;">
            <a href="${inviteLink}" style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; padding:14px 32px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:1.1rem; display:inline-block; box-shadow:0 4px 15px rgba(99,102,241,0.4);">Accept Invitation</a>
          </div>
          
          <div style="border-top:1px solid #e2e8f0; padding-top:20px; font-size:0.8rem; color:#94a3b8;">
            <p><strong>Legal Notes:</strong> By accepting this invitation, you agree to the <a href="${frontendBaseUrl}/legal/index.html" style="color:#6366f1;">Terms of Service and Privacy Policy</a>.</p>
          </div>
        </div>
      </div>
    `;
    await sendEmail(invite.toEmail, `Invitation to join DPGNotes from ${invite.senderName}`, receiverHtml);

    // Notify Admin
    const adminHtml = `
      <div style="font-family:Arial,sans-serif; padding:20px;">
        <h2>New Invitation Dispatched</h2>
        <p><strong>From:</strong> ${invite.senderName} (${invite.senderEmail})</p>
        <p><strong>To:</strong> ${invite.toName} (${invite.toEmail})</p>
        <p><strong>Referrer Code:</strong> ${invite.referrerCode}</p>
      </div>
    `;
    await sendEmail(process.env.ADMIN_EMAIL || process.env.EMAIL_FROM, `[Admin Alert] Invitation Dispatched to ${invite.toName}`, adminHtml);

    res.send(`
      <div style="font-family:Arial,sans-serif; text-align:center; padding:50px; color:#10b981;">
        <h2>✅ Invitation Successfully Dispatched!</h2>
        <p>The invitation has been sent to ${invite.toName}. You may now close this window.</p>
      </div>
    `);
  } catch (err) {
    console.error("Invite verify error:", err);
    res.status(500).send("An error occurred during verification.");
  }
});

app.post('/api/invite/view', async (req, res) => {
  const { referrerCode } = req.body;
  if (!referrerCode) return res.status(400).json({ error: "Missing referrer code." });

  try {
    const snapshot = await db.collection("invitations").where("referrerCode", "==", referrerCode).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: "Invalid referrer code." });

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();
    
    if (invite.status === "Receive") {
      await inviteDoc.ref.update({ status: "View" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Invite view error:", err);
    res.status(500).json({ error: "Server error." });
  }
});

app.post('/api/invite/accept', async (req, res) => {
  const { referrerCode, newUserId, newUserEmail } = req.body;
  if (!referrerCode || !newUserId) return res.status(400).json({ error: "Missing required fields." });

  try {
    const snapshot = await db.collection("invitations").where("referrerCode", "==", referrerCode).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: "Invalid referrer code." });

    const inviteDoc = snapshot.docs[0];
    const invite = inviteDoc.data();

    // Already accepted or rejected?
    if (invite.status === "Accept" || invite.status === "Rejected") {
      return res.json({ success: true, message: "Code already used." });
    }

    await inviteDoc.ref.update({ 
      status: "Accept", 
      acceptedByUid: newUserId,
      acceptedByEmail: newUserEmail,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Gratitude Mail Check Logic (10 views or 3 acceptances)
    // For simplicity, we trigger gratitude mail per 3 acceptances for a sender
    const acceptSnapshot = await db.collection("invitations")
      .where("senderId", "==", invite.senderId)
      .where("status", "==", "Accept")
      .get();
    
    if (acceptSnapshot.size > 0 && acceptSnapshot.size % 3 === 0) {
      const gratitudeHtml = `
        <div style="font-family:Arial,sans-serif; padding:20px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; border-radius:12px;">
          <h2 style="color:#d97706;">🌟 A Huge Thank You!</h2>
          <p>Hi ${invite.senderName},</p>
          <p>We wanted to express our deepest gratitude! Thanks to you, ${acceptSnapshot.size} new contributors have now joined the DPGNotes community through your invitations.</p>
          <p>Your effort in growing our network is highly appreciated.</p>
          <p>Keep up the amazing work!</p>
          <p>Best,<br>The DPGNotes Team</p>
        </div>
      `;
      await sendEmail(invite.senderEmail, `Thank you for growing the DPGNotes community!`, gratitudeHtml);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Invite accept error:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// ==========================================
// CONTRIBUTOR NETWORKING & SOCIAL API
// ==========================================

// Helper: Clean expired messages (TTL)
async function cleanExpiredMessages() {
  try {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await db.collectionGroup("messages")
      .where("expiresAt", "<", now)
      .get();
    
    const batch = db.batch();
    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only delete if it wasn't saved to prevent deletion
      if (!data.isSaved) {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`[TTL Cleanup] Purged ${count} expired messages.`);
    }
  } catch (err) {
    console.error("[TTL Cleanup] Error cleaning expired messages:", err);
  }
}

// 1. List Contributor Profiles (Public / All users search)
app.get('/api/social/list-profiles', async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const docsSnapshot = await db.collection("documents").get();
    
    // Map document counts and likes per user
    const statsMap = {};
    docsSnapshot.forEach(d => {
      const data = d.data();
      const uid = data.userId || data.uploaderUid;
      if (uid) {
        if (!statsMap[uid]) statsMap[uid] = { uploads: 0, likes: 0 };
        statsMap[uid].uploads++;
        const likesArr = Array.isArray(data.likes) ? data.likes.length : (data.likes || 0);
        statsMap[uid].likes += likesArr;
      }
    });

    const profiles = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const uStats = statsMap[doc.id] || { uploads: 0, likes: 0 };
      profiles.push({
        uid: doc.id,
        name: data.name || data.email?.split('@')[0] || "Anonymous",
        email: data.email || "",
        bio: data.bio || "No bio added yet.",
        avatarUrl: data.profilePic || data.photoURL || data.avatarUrl || "",
        bannerUrl: data.bannerPic || data.bannerUrl || "",
        discipline: data.discipline || "N/A",
        uploadedCount: uStats.uploads,
        likesCount: uStats.likes
      });
    });
    res.json(profiles);
  } catch (err) {
    console.error("List profiles failed:", err);
    res.status(500).json({ error: "Failed to list profiles" });
  }
});

// 2. Relationship State Check
app.post('/api/social/connections-state', async (req, res) => {
  const { senderId, receiverId } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId and receiverId are required" });
  }
  try {
    const connId1 = `${senderId}_${receiverId}`;
    const connId2 = `${receiverId}_${senderId}`;
    
    let connection = null;
    let connDoc = await db.collection("connections").doc(connId1).get();
    if (connDoc.exists) {
      connection = { ...connDoc.data(), initiatedByMe: true };
    } else {
      connDoc = await db.collection("connections").doc(connId2).get();
      if (connDoc.exists) {
        connection = { ...connDoc.data(), initiatedByMe: false };
      }
    }

    // Check if following
    const followDoc = await db.collection("follows")
      .doc(`${senderId}_${receiverId}`).get();
    const isFollowing = followDoc.exists;

    // Get follower counts
    const followersSnapshot = await db.collection("follows")
      .where("followingId", "==", receiverId).get();
    const followerCount = followersSnapshot.size;

    res.json({
      connection,
      isFollowing,
      followerCount
    });
  } catch (err) {
    console.error("Get connection state failed:", err);
    res.status(500).json({ error: "Server error checking relationship state" });
  }
});

// 3. Follow / Unfollow Toggle
app.post('/api/social/follow', async (req, res) => {
  const { followerId, followerName, followingId, followingName } = req.body;
  if (!followerId || !followingId) {
    return res.status(400).json({ error: "followerId and followingId are required" });
  }
  try {
    const followId = `${followerId}_${followingId}`;
    const followRef = db.collection("follows").doc(followId);
    const doc = await followRef.get();
    
    if (doc.exists) {
      await followRef.delete();
      return res.json({ status: "unfollowed" });
    } else {
      await followRef.set({
        followerId,
        followerName: followerName || "Contributor",
        followingId,
        followingName: followingName || "Contributor",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send Email to followed user & Admin
      try {
        const followingDoc = await db.collection("users").doc(followingId).get();
        if (followingDoc.exists && followingDoc.data().email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto;">
              <h2 style="color: #8b5cf6;">New Follower Alert! 👤</h2>
              <p>Hello ${followingName || 'Contributor'},</p>
              <p><strong>${followerName}</strong> has started following your contributor profile on DPGNotes.</p>
              <div style="margin: 2rem 0; text-align: center;">
                <a href="https://dpgnotes.web.app/profile.html?uid=${followerId}" style="background: #8b5cf6; color: white; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Profile</a>
              </div>
            </div>
          `;
          await sendEmail(followingDoc.data().email, `${followerName} is now following you on DPGNotes`, emailHtml);
        }
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await sendEmail(adminEmail, "Social Alert: New Follower", `<p><strong>${followerName}</strong> is now following <strong>${followingName}</strong>.</p>`);
        }
      } catch(e) { console.error("Follow email error:", e); }

      return res.json({ status: "followed" });
    }
  } catch (err) {
    console.error("Follow toggle failed:", err);
    res.status(500).json({ error: "Follow toggle failed" });
  }
});

// 4. Send Connection Request
app.post('/api/social/connect-request', async (req, res) => {
  const { senderId, senderName, senderEmail, receiverId, receiverName, receiverEmail } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId and receiverId are required" });
  }
  try {
    const connId = `${senderId}_${receiverId}`;
    await db.collection("connections").doc(connId).set({
      senderId,
      senderName: senderName || "Contributor",
      senderEmail: senderEmail || "",
      receiverId,
      receiverName: receiverName || "Contributor",
      receiverEmail: receiverEmail || "",
      status: "pending",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Fetch Sender profile details & analytics for rich email
    let senderPhoto = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    let senderBanner = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe";
    let senderLinkedin = "";
    let senderGithub = "";
    let senderUploads = 0;
    let senderLikes = 0;
    let senderShares = 0;
    let senderClicks = 0;

    try {
      const sDoc = await db.collection("users").doc(senderId).get();
      if (sDoc.exists) {
        const sData = sDoc.data();
        if (sData.profilePic || sData.photoURL) senderPhoto = sData.profilePic || sData.photoURL;
        if (sData.bannerPic || sData.bannerUrl) senderBanner = sData.bannerPic || sData.bannerUrl;
        senderLinkedin = sData.linkedin || "";
        senderGithub = sData.github || "";
        senderShares = sData.shares || 0;
      }
      const docsSnap = await db.collection("documents").where("userId", "==", senderId).get();
      senderUploads = docsSnap.size;
      docsSnap.forEach(d => {
        const l = d.data().likes;
        senderLikes += Array.isArray(l) ? l.length : (l || 0);
      });

      const clickSnap = await db.collection("share_engagements").get();
      clickSnap.forEach(c => {
        if (c.data().uploaderUid === senderId) senderClicks++;
      });
    } catch (e) { console.error("Error fetching sender stats:", e); }

    // Send Rich email via Brevo SMTP to Recipient
    if (receiverEmail) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 16px; max-width: 620px; margin: auto; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Cover Banner -->
          ${senderBanner ? `<div style="text-align: center; border-radius: 12px 12px 0 0; overflow: hidden;"><img src="${senderBanner}" style="width: 100%; max-width: 620px; height: auto; max-height: 160px; object-fit: cover; display: block;" alt="Cover Banner"></div>` : ''}
          
          <div style="padding: 20px;">
            <!-- Profile Info Row -->
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 20px;">
              <tr>
                ${senderPhoto ? `
                <td style="width: 70px; vertical-align: middle; padding-right: 15px;">
                  <img src="${senderPhoto}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #6366f1; display: block;" alt="Profile Photo">
                </td>
                ` : ''}
                <td style="vertical-align: middle; text-align: left;">
                  <h2 style="color: #6366f1; margin: 0; font-size: 1.35rem; font-weight: bold;">${senderName} wants to connect with you</h2>
                  <p style="color: #94a3b8; font-size: 0.9rem; margin: 4px 0 0 0;">${senderEmail}</p>
                </td>
              </tr>
            </table>

            <div style="margin-bottom: 20px; font-size: 0.85rem;">
              ${senderLinkedin ? `<a href="${senderLinkedin}" target="_blank" style="color: #60a5fa; text-decoration: underline; margin-right: 15px; display: inline-block;">Connect on LinkedIn</a>` : ''}
              ${senderGithub ? `<a href="${senderGithub}" target="_blank" style="color: #c084fc; text-decoration: underline; display: inline-block;">View on GitHub</a>` : ''}
            </div>

            <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
              <h4 style="margin: 0 0 12px 0; color: #cbd5e1; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">Contributor Analytics</h4>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; font-size: 0.85rem; color: #cbd5e1;">
                <tr>
                  <td style="width: 50%; padding-bottom: 8px;">📄 Total Contributions: <strong>${senderUploads}</strong></td>
                  <td style="width: 50%; padding-bottom: 8px;">❤️ Likes Received: <strong>${senderLikes}</strong></td>
                </tr>
                <tr>
                  <td>📣 Shares Generated: <strong>${senderShares}</strong></td>
                  <td>🔗 Link Clicks: <strong>${senderClicks}</strong></td>
                </tr>
              </table>
            </div>

            <p style="line-height: 1.5; color: #e2e8f0; font-size: 0.95rem;">
              <strong>${senderName}</strong> has sent a connection request to you. You can accept or reject the Request by clicking the button below:
            </p>

            <div style="margin: 2rem 0; text-align: center;">
              <a href="https://dpgnotes.web.app/profile.html?uid=${senderId}&action=accept_connection" style="background: #10b981; color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 0 8px;">Accept</a>
              <a href="https://dpgnotes.web.app/profile.html?uid=${senderId}&action=reject_connection" style="background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 0 8px;">Decline</a>
            </div>

            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 1.5rem; line-height: 1.5;">
              If you don't know the user kindly visit his <a href="https://dpgnotes.web.app/profile.html?uid=${senderId}" style="color: #818cf8; text-decoration: underline;">profile page</a> and review the request in notification tab on your dashboard or Click the "Accept" / "Decline" Button to perform Mark as "Read" for this special type of Notification.
            </p>
          </div>
        </div>
      `;
      await sendEmail(receiverEmail, `${senderName} wants to connect with you`, emailHtml);
    }

    // In-app notification for recipient
    if (receiverEmail) {
      await db.collection("notifications").add({
        email: receiverEmail,
        toEmail: receiverEmail,
        type: "alert",
        title: "🤝 Connection Request",
        message: `${senderName} has sent you a connection request.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Send email digest notify to Admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail(adminEmail, `Connection Request: ${senderName} to ${receiverName}`, `
        <h3>Social Connection Request Alert</h3>
        <p>Contributor <strong>${senderName}</strong> (${senderEmail}) sent a connection request to <strong>${receiverName}</strong> (${receiverEmail}).</p>
      `);
    }

    res.json({ message: "Connection request sent successfully." });
  } catch (err) {
    console.error("Connect request failed:", err);
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

// 5. Respond to Connection Request (Accept / Reject)
app.post('/api/social/connect-respond', async (req, res) => {
  const { senderId, receiverId, status } = req.body;
  if (!senderId || !receiverId || !status) {
    return res.status(400).json({ error: "senderId, receiverId, and status are required" });
  }
  try {
    const connId1 = `${senderId}_${receiverId}`;
    const connId2 = `${receiverId}_${senderId}`;

    let connRef = db.collection("connections").doc(connId1);
    let doc = await connRef.get();
    if (!doc.exists) {
      connRef = db.collection("connections").doc(connId2);
      doc = await connRef.get();
    }

    if (!doc.exists) {
      return res.status(404).json({ error: "Connection record not found" });
    }

    const connData = doc.data();
    await connRef.update({
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const isAccepted = status === 'accepted';
    const statusText = isAccepted ? 'Accepted' : 'Declined';

    // 1. Notify Original Sender via email
    if (connData.senderEmail) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto;">
          <h2 style="color: ${isAccepted ? '#10b981' : '#f59e0b'};">Connection Request ${statusText}!</h2>
          <p>Hello ${connData.senderName},</p>
          <p><strong>${connData.receiverName}</strong> has ${statusText.toLowerCase()} your connection request.</p>
          ${isAccepted ? `<div style="margin: 2rem 0; text-align: center;"><a href="https://dpgnotes.web.app/profile.html?uid=${receiverId}" style="background: #10b981; color: white; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Send a Message</a></div>` : ''}
        </div>
      `;
      await sendEmail(connData.senderEmail, `Connection Request ${statusText} by ${connData.receiverName}`, emailHtml);

      // In-app notification for sender
      await db.collection("notifications").add({
        email: connData.senderEmail,
        toEmail: connData.senderEmail,
        type: isAccepted ? "success" : "alert",
        title: `🤝 Connection ${statusText}`,
        message: `${connData.receiverName} has ${statusText.toLowerCase()} your connection request.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 2. Notify Recipient via email as well
    if (connData.receiverEmail) {
      const emailHtmlRec = `
        <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto;">
          <h2 style="color: #6366f1;">Connection Request Update</h2>
          <p>Hello ${connData.receiverName},</p>
          <p>You have ${statusText.toLowerCase()} the connection request from <strong>${connData.senderName}</strong>.</p>
        </div>
      `;
      await sendEmail(connData.receiverEmail, `Connection Request ${statusText}`, emailHtmlRec);
    }

    // 3. Notify Admin by email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail(adminEmail, `Connection ${statusText}: ${connData.senderName} & ${connData.receiverName}`, `
        <h3>Social Connection Response Alert</h3>
        <p>Contributor <strong>${connData.receiverName}</strong> has <strong>${statusText.toUpperCase()}</strong> the connection request from <strong>${connData.senderName}</strong>.</p>
      `);
    }

    res.json({ status });
  } catch (err) {
    console.error("Connect response failed:", err);
    res.status(500).json({ error: "Failed to respond to connection request" });
  }
});

// 6. Send Message (Direct Messaging with 14-day Auto-Delete TTL)
app.post('/api/social/send-message', async (req, res) => {
  const { senderId, senderName, receiverId, receiverName, receiverEmail, text } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: "senderId, receiverId, and text are required" });
  }
  try {
    // Generate unique chat ID sorted alphabetically by UIDs
    const chatId = [senderId, receiverId].sort().join("_");
    const expiresAt = new Date(Date.now() + 90 * 60 * 60 * 1000); // 90 hours from now

    const msgRef = await db.collection("chats").doc(chatId).collection("messages").add({
      senderId,
      senderName: senderName || "Contributor",
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      isSaved: false, // Default is not saved (allows auto-deletion)
      deletedFor: [] // List of user IDs who deleted this message for themselves
    });

    // Notify receiver of new message
    if (receiverEmail) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto;">
          <h2 style="color: #6366f1;">New Message Received 💬</h2>
          <p>Hello ${receiverName || 'Contributor'},</p>
          <p><strong>${senderName}</strong> sent you a message:</p>
          <blockquote style="background: rgba(255,255,255,0.05); padding: 1rem; border-left: 4px solid #6366f1; border-radius: 4px; color: #cbd5e1;">
            "${text}"
          </blockquote>
          <div style="margin: 2rem 0; text-align: center;">
            <a href="https://dpgnotes.web.app/profile.html?uid=${senderId}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: bold;">Reply on DPGNotes</a>
          </div>
        </div>
      `;
      await sendEmail(receiverEmail, `New Message from ${senderName}`, emailHtml);
    }

    res.json({ messageId: msgRef.id, expiresAt });
  } catch (err) {
    console.error("Send message failed:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// 7. Get Messages
app.post('/api/social/get-messages', async (req, res) => {
  const { senderId, receiverId, viewerId } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId and receiverId are required" });
  }
  try {
    const chatId = [senderId, receiverId].sort().join("_");
    
    // Asynchronously trigger expired messages cleanup
    cleanExpiredMessages().catch(err => console.error("Async TTL clean failed:", err));

    const snapshot = await db.collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = [];
    const now = Date.now();

    snapshot.forEach(doc => {
      const data = doc.data();
      // Double check client-side TTL filtering just in case cleanup hasn't run yet
      const expiry = data.expiresAt ? data.expiresAt.toDate().getTime() : 0;
      if (expiry > now || data.isSaved) {
        // Only return messages NOT deleted for the current viewerId
        const deletedFor = data.deletedFor || [];
        if (!viewerId || !deletedFor.includes(viewerId)) {
          // Format timestamp safely
          let time = "";
          if (data.createdAt && data.createdAt.toDate) {
            time = data.createdAt.toDate().toISOString();
          }
          
          messages.push({
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            createdAt: time,
            isSaved: data.isSaved || false,
            ageInHours: data.createdAt ? (Date.now() - data.createdAt.toDate().getTime()) / 3600000 : 0
          });
        }
      }
    });

    res.json(messages);
  } catch (err) {
    console.error("Get messages failed:", err);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

// 8. Message Actions (Edit, Save, Delete, Report)
app.post('/api/social/message-action', async (req, res) => {
  const { action, chatId, messageId, userId, newText, reporterName } = req.body;
  if (!action || !chatId || !messageId || !userId) {
    return res.status(400).json({ error: "action, chatId, messageId, and userId are required" });
  }
  try {
    const msgRef = db.collection("chats").doc(chatId).collection("messages").doc(messageId);
    const doc = await msgRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Message not found" });
    }

    const data = doc.data();

    // ACTION: EDIT
    if (action === 'edit') {
      if (data.senderId !== userId) {
        return res.status(403).json({ error: "Unauthorized to edit this message" });
      }
      await msgRef.update({ text: newText });
      return res.json({ success: true, text: newText });
    }

    // ACTION: SAVE / PREVENT TTL DELETION
    if (action === 'save') {
      const newSaveState = !data.isSaved;
      await msgRef.update({ isSaved: newSaveState });
      return res.json({ success: true, isSaved: newSaveState });
    }

    // ACTION: DELETE FOR ME
    if (action === 'deleteForMe') {
      const deletedFor = data.deletedFor || [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }
      await msgRef.update({ deletedFor });
      return res.json({ success: true });
    }

    // ACTION: DELETE FOR EVERYONE (Limit to 1 day / 24 hours)
    if (action === 'deleteForEveryone') {
      if (data.senderId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this message" });
      }
      const ageInMs = Date.now() - (data.createdAt ? data.createdAt.toDate().getTime() : 0);
      const oneDayInMs = 24 * 60 * 60 * 1000;
      if (ageInMs > oneDayInMs) {
        return res.status(400).json({ error: "Messages older than 1 day cannot be deleted for everyone" });
      }
      await msgRef.delete();
      return res.json({ success: true });
    }

    // ACTION: REPORT TO COMMUNITY
    if (action === 'report') {
      await db.collection("community_reports").add({
        chatId,
        messageId,
        reportedBy: userId,
        reporterName: reporterName || "Anonymous",
        senderId: data.senderId,
        senderName: data.senderName,
        messageText: data.text,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Email notification to Admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; background: #2d0f0f; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto;">
            <h2 style="color: #ef4444;">⚠️ Malicious Content Report</h2>
            <p>A message has been reported for security or community policy violations:</p>
            <hr style="border: 1px solid rgba(255,255,255,0.1);" />
            <p><strong>Sender:</strong> ${data.senderName} (${data.senderId})</p>
            <p><strong>Reporter:</strong> ${reporterName || 'Anonymous'} (${userId})</p>
            <p><strong>Message Content:</strong></p>
            <blockquote style="background: rgba(0,0,0,0.3); padding: 1rem; border-left: 4px solid #ef4444;">
              "${data.text}"
            </blockquote>
            <p>Inspect and act from the Admin Command Center immediately.</p>
          </div>
        `;
        await sendEmail(adminEmail, "Security Alert: Harmful Message Reported", emailHtml);
      }

      return res.json({ success: true });
    }

    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("Message action failed:", err);
    res.status(500).json({ error: "Failed to process message action" });
  }
});

// 9. Admin Social & Connections Engagement Analytics
app.get('/api/admin/engagement-analytics', async (req, res) => {
  try {
    const totalConnections = await db.collection("connections").get();
    const totalFollows = await db.collection("follows").get();
    const totalReports = await db.collection("community_reports").get();

    // Map connection states
    let pendingCount = 0;
    let acceptedCount = 0;
    totalConnections.forEach(doc => {
      const s = doc.data().status;
      if (s === 'pending') pendingCount++;
      if (s === 'accepted') acceptedCount++;
    });

    res.json({
      connectionsCount: totalConnections.size,
      followsCount: totalFollows.size,
      reportsCount: totalReports.size,
      pendingCount,
      acceptedCount
    });
  } catch (err) {
    console.error("Engagement telemetry failed:", err);
    res.status(500).json({ error: "Telemetry aggregation failed" });
  }
});

// 10. Admin Delete System Notifications (Single or Bulk)
app.post('/api/admin/delete-notifs', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array is required" });
  }
  try {
    const batch = db.batch();
    ids.forEach(id => {
      batch.delete(db.collection("notifications").doc(id));
    });
    await batch.commit();
    res.json({ message: "Notifications deleted successfully" });
  } catch (err) {
    console.error("Delete notifications failed:", err);
    res.status(500).json({ error: "Failed to delete notifications" });
  }
});

// 11. Toggle Keep Status (Save from 15-day auto deletion)
app.post('/api/admin/toggle-keep-notif', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "id is required" });
  try {
    const ref = db.collection("notifications").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Notification doc not found" });
    const currentKeep = doc.data().isKept || doc.data().keepPermanently || false;
    await ref.update({ isKept: !currentKeep, keepPermanently: !currentKeep });
    res.json({ isKept: !currentKeep });
  } catch (err) {
    console.error("Toggle keep failed:", err);
    res.status(500).json({ error: "Failed to update keep status" });
  }
});

// 12. Notification 15-Day Auto Delete Purge Routine
async function purgeOldNotifications() {
  try {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const snap = await db.collection("notifications")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(fifteenDaysAgo))
      .get();
    
    let count = 0;
    const batch = db.batch();
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.isKept && !d.keepPermanently) {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`[Notification Purge] Cleaned ${count} notifications older than 15 days.`);
    }
  } catch (err) {
    console.error("[Notification Purge Error]:", err);
  }
}
setInterval(purgeOldNotifications, 6 * 60 * 60 * 1000); // Check every 6 hours

// 13. Send Network Group Message (Visible to all mutual connections)
app.post('/api/social/send-group-message', async (req, res) => {
  const { senderId, senderName, senderPhoto, text } = req.body;
  if (!senderId || !text) {
    return res.status(400).json({ error: "senderId and text are required" });
  }
  try {
    // 1. Fetch all mutual connections of senderId
    const c1 = await db.collection("connections")
      .where("senderId", "==", senderId)
      .where("status", "==", "accepted").get();
    
    const c2 = await db.collection("connections")
      .where("receiverId", "==", senderId)
      .where("status", "==", "accepted").get();

    const recipients = new Set();
    c1.forEach(doc => recipients.add(doc.data().receiverId));
    c2.forEach(doc => recipients.add(doc.data().senderId));

    const groupExpiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 60 * 60 * 1000));
    const newMsg = {
      senderId,
      senderName: senderName || "Contributor",
      senderPhoto: senderPhoto || "",
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: groupExpiresAt,
      recipients: Array.from(recipients)
    };

    await db.collection("group_messages").add(newMsg);
    res.json({ message: "Network group message sent successfully." });
  } catch (err) {
    console.error("Group message failed:", err);
    res.status(500).json({ error: "Failed to send network group message" });
  }
});

// 14. Get Network Group Messages
app.get('/api/social/get-group-messages', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    // Retrieve group messages where senderId == userId OR recipients contains userId
    const messages = [];
    const q1 = await db.collection("group_messages").where("senderId", "==", userId).get();
    const q2 = await db.collection("group_messages").where("recipients", "array-contains", userId).get();

    const seenIds = new Set();
    const addMsgs = (snap) => {
      const now = Date.now();
      snap.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const d = doc.data();
          // Filter out expired messages (90-hour TTL)
          const expiry = d.expiresAt ? d.expiresAt.toDate().getTime() : (now + 1);
          if (expiry > now) {
            messages.push({
              id: doc.id,
              ...d,
              createdAt: d.createdAt ? d.createdAt.toDate().toISOString() : new Date().toISOString()
            });
          }
        }
      });
    };

    addMsgs(q1);
    addMsgs(q2);

    // Sort chronologically
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(messages);
  } catch (err) {
    console.error("Get group messages failed:", err);
    res.status(500).json({ error: "Failed to load network group messages" });
  }
});

// 15. Get Network Connections & Followers Telemetry (Bypasses security rule constraints)
app.get('/api/social/get-network', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId query parameter is required" });
  try {
    // 1. Fetch Followers
    const followsSnap = await db.collection("follows").where("followingId", "==", userId).get();
    const followers = [];
    followsSnap.forEach(d => {
      const data = d.data();
      followers.push({
        followerId: data.followerId || "",
        followerName: data.followerName || "Contributor"
      });
    });

    // 2. Fetch Mutual Connections
    const c1 = await db.collection("connections")
      .where("senderId", "==", userId)
      .where("status", "==", "accepted").get();
    
    const c2 = await db.collection("connections")
      .where("receiverId", "==", userId)
      .where("status", "==", "accepted").get();

    const connections = [];
    c1.forEach(d => {
      const data = d.data();
      connections.push({
        userId: data.receiverId,
        name: data.receiverName || "Contributor"
      });
    });
    c2.forEach(d => {
      const data = d.data();
      connections.push({
        userId: data.senderId,
        name: data.senderName || "Contributor"
      });
    });

    // 3. Fetch Received Pending Connections (Only for profile owner check)
    const pendingSnap = await db.collection("connections")
      .where("receiverId", "==", userId)
      .where("status", "==", "pending").get();
    
    const pendingRequests = [];
    pendingSnap.forEach(d => {
      const data = d.data();
      pendingRequests.push({
        senderId: data.senderId,
        senderName: data.senderName || "Contributor"
      });
    });

    res.json({
      followers,
      connections,
      pendingRequests
    });
  } catch (err) {
    console.error("Get network failed:", err);
    res.status(500).json({ error: "Failed to retrieve network telemetry" });
  }
});

const { handleAiQuery } = require('./ai_engine');

// 16. DPGNotes AI Engine Query Endpoint
app.post('/api/ai/query', async (req, res) => {
  const { userId, userEmail, userMessage } = req.body;
  if (!userId || !userMessage) {
    return res.status(400).json({ error: "userId and userMessage are required" });
  }
  try {
    const aiResponse = await handleAiQuery(db, userId, userEmail, userMessage);
    res.json({ response: aiResponse });
  } catch (err) {
    console.error("AI query failed:", err);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

// 17. One-Time URL Shortener & Asset Abstraction Proxy Engine
app.post('/api/url/shorten', async (req, res) => {
  const { rawUrl } = req.body;
  if (!rawUrl) return res.status(400).json({ error: "rawUrl is required" });

  try {
    const key = Math.random().toString(36).substring(2, 9);
    await db.collection("shortened_urls").doc(key).set({
      key,
      rawUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const shortUrl = `${req.protocol}://${req.get('host')}/api/url/asset/${key}`;
    res.json({ key, shortUrl });
  } catch (err) {
    console.error("URL shortening failed:", err);
    res.status(500).json({ error: "Failed to shorten URL" });
  }
});

app.get('/api/url/asset/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const docSnap = await db.collection("shortened_urls").doc(key).get();
    if (!docSnap.exists) {
      return res.status(404).send("Invalid or expired asset token.");
    }

    const { rawUrl } = docSnap.data();

    // Check if opened directly in browser document navigation (independent tab)
    const isDocumentFetch = req.headers['sec-fetch-dest'] === 'document' || !req.headers.referer;

    if (isDocumentFetch && rawUrl.toLowerCase().endsWith('.pdf')) {
      // Redirect safely to DPGNotes PDF viewer instead of exposing raw URL directly
      const safeViewerUrl = `/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(rawUrl)}`;
      return res.redirect(safeViewerUrl);
    }

    // Proxy the asset buffer so raw Cloudinary/GitHub URLs are never exposed in DOM
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(rawUrl);
    
    if (!response.ok) {
      return res.status(response.status).send("Failed to retrieve asset");
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    response.body.pipe(res);

  } catch (err) {
    console.error("Asset proxy failed:", err);
    res.status(500).send("Asset retrieval error.");
  }
});

// Catch-all route to prevent "Cannot GET" HTML errors when accessing APIs via browser
app.use('/api', (req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found or method not allowed.", 
    message: "This is a DPGNotes API endpoint. It requires a specific request method (usually POST) and payload. It cannot be accessed directly via the browser." 
  });
});

app.use((req, res) => {
  res.status(404).send("404 - Not Found");
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Run duplicate profiles AI scan on start
  await scanDuplicateProfiles();
});
