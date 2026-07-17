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
    // Using REST API since Admin SDK might not be initialized
    const firestoreRes = await axios.get('https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/documents?pageSize=1000');
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Add Homepage
    xml += `
  <url>
    <loc>https://dpgnotes.web.app/index.html</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    if (firestoreRes.data && firestoreRes.data.documents) {
      firestoreRes.data.documents.forEach(doc => {
        // doc.name is something like "projects/dpgnotes/databases/(default)/documents/documents/DOCUMENT_ID"
        const docId = doc.name.split('/').pop();
        const date = doc.createTime || new Date().toISOString();
        
        xml += `
  <url>
    <loc>https://dpgnotes.web.app/index.html?view=${docId}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      });
    }

    xml += `\n</urlset>`;
    
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
app.post('/api/upload', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    
    // Convert buffer to base64 for fallback Cloudinary upload
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let uploadPayload = "data:" + req.file.mimetype + ";base64," + b64;
    
    // Removed auto-compression from /api/upload
    
    // Upload to Cloudinary
    const isProfile = req.query.type === 'profile';
    const result = await cloudinary.uploader.upload(uploadPayload, {
      resource_type: isProfile ? "image" : "raw", // For PDFs use raw, images use image
      folder: isProfile ? "dpgnotes_profiles" : "dpgnotes_pdfs"
    });
    
    res.json({ pdfUrl: result.secure_url });
  } catch (error) {
    console.error("Upload Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Upload failed" });
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
// ROUTES: ADMIN AUTH
// ==========================================
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
// DYNAMIC SITEMAP API (For Google Search Console)
// ==========================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const docsRef = db.collection("documents");
    const snapshot = await docsRef.get();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Add main static pages
    const baseUrl = "https://dpgnotes.web.app"; 
    xml += `  <url>\n    <loc>${baseUrl}/index.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/dashboard.html</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/admin.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

    // Add dynamic document pages via the PDF Viewer parameters
    snapshot.forEach(doc => {
      const data = doc.data();
      const tagsStr = Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '');
      // Ensure the URL is properly escaped for XML
      let viewerUrl = `https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(doc.id)}&description=${encodeURIComponent(data.description)}&tags=${encodeURIComponent(tagsStr)}`;
      
      // Escape ampersands for valid XML
      viewerUrl = viewerUrl.replace(/&/g, '&amp;');
      
      xml += `  <url>\n    <loc>${viewerUrl}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    });
    
    xml += `</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Failed to generate sitemap:", error);
    res.status(500).send("Server Error");
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
