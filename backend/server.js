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

// ==========================================
// INIT APP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

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

    res.json({ token, shareUrl: `https://dpgnotes.web.app/index.html?share=${token}` });
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
        <br><br>
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

// 1. Welcome New Contributor
app.post('/api/email/welcome', async (req, res) => {
  const { email, name } = req.body;
  const html = createTemplate("Welcome to DPGNotes! 🎉", `<p>Hi <strong>${name}</strong>,</p><p>We are thrilled to have you join our contributor community. Your knowledge will help thousands of students succeed.</p>`);
  await sendEmail(email, "Welcome to DPGNotes!", html);
  res.json({ message: "Sent" });
});

// 2. Honour on first Contribution
app.post('/api/email/first-contribution', async (req, res) => {
  const { email, title } = req.body;
  const html = createTemplate("First Contribution Honour! 🏅", `<p>Congratulations on uploading your very first resource: <strong>${title}</strong>.</p><p>You are officially a DPGNotes Contributor!</p>`);
  await sendEmail(email, "Your First Contribution!", html);
  res.json({ message: "Sent" });
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
