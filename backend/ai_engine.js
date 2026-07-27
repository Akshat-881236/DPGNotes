const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Global Cache for Legal text data
let legalTextsCache = "";

// 1. Initial Scanner for public/legal files
function scanLegalFiles() {
  try {
    const legalIndexPath = path.join(__dirname, '..', 'public', 'legal', 'index.html');
    if (fs.existsSync(legalIndexPath)) {
      const html = fs.readFileSync(legalIndexPath, 'utf8');
      // Clean HTML tags to get raw paragraphs
      legalTextsCache = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      console.log("AI Legal Scanner: public/legal/index.html scanned and cached.");
    }

    // Also scan training.md
    const trainingPath = path.join(__dirname, 'training.md');
    if (fs.existsSync(trainingPath)) {
      legalTextsCache += "\n\n" + fs.readFileSync(trainingPath, 'utf8');
    }
  } catch (err) {
    console.error("AI Legal Scanner failed:", err);
  }
}

// Run scanner immediately
scanLegalFiles();

// 2. Gemini API Helper
async function askGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// 3. Generate Share Link (via Firestore + backend endpoint pattern)
async function generateShareLinkForDoc(db, docData) {
  try {
    const crypto = require('crypto');
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const baseUrl = 'https://dpgnotes.web.app/index.html';
    const shareUrl = `${baseUrl}?share=${token}`;

    await db.collection("share_links").doc(token).set({
      token,
      docId: docData.id,
      title: docData.title || 'Untitled',
      category: docData.category || '',
      discipline: docData.discipline || '',
      uploader: docData.userName || docData.uploader || 'Contributor',
      uploaderUid: docData.userId || '',
      pdfUrl: docData.pdfUrl || '',
      description: docData.description || '',
      tags: docData.tags || '',
      originalUrl: baseUrl,
      clicks: 0,
      createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
    });

    return { token, shareUrl };
  } catch (e) {
    console.error("Share link generation in AI engine failed:", e);
    return null;
  }
}

// 4. Query processing engine
async function handleAiQuery(db, userId, userEmail, userMessage) {
  // Load Context Guidelines
  let rules = "";
  let communication = "";
  let knowledge = "";

  try {
    rules = fs.readFileSync(path.join(__dirname, 'ai', 'rules.md'), 'utf8');
    communication = fs.readFileSync(path.join(__dirname, 'ai', 'communication.md'), 'utf8');
    knowledge = fs.readFileSync(path.join(__dirname, 'ai', 'knowledge.md'), 'utf8');
  } catch (e) {
    // Guidelines not found, use defaults
  }

  // 5. User Analytics Telemetry
  let statsContext = "";
  let userDocs = [];
  try {
    const snap = await db.collection("documents").where("userId", "==", userId).get();
    let totalLikes = 0;
    let totalShares = 0;
    let totalClicks = 0;

    snap.forEach(docRef => {
      const data = docRef.data();
      userDocs.push({ id: docRef.id, ...data });
      totalLikes += (data.likes && Array.isArray(data.likes)) ? data.likes.length : 0;
      totalShares += data.shareCount || 0;
      totalClicks += data.ctrCount || 0;
    });

    const engagementRate = totalClicks > 0 ? (((totalLikes + totalShares) / totalClicks) * 100).toFixed(1) : 0;

    statsContext = `
### Your Contributor Telemetry 📊
- **Total Uploaded Resources:** ${snap.size}
- **Accumulated Likes Received:** ${totalLikes} ❤️
- **Generated Share Links:** ${totalShares} 🔗
- **Total Clicks (CTR):** ${totalClicks} 👀
- **Overall Engagement Rate:** **${engagementRate}%**

**Your Uploaded Documents:**
${userDocs.map(d => `- **${d.title || 'Untitled'}** | Likes: ${Array.isArray(d.likes) ? d.likes.length : 0} | Shares: ${d.shareCount || 0} | Category: ${d.category || 'N/A'}`).join('\n')}
`;
  } catch (e) {
    console.error("Analytics fetch failed:", e);
  }

  // 6. Top Ranking Resources across all docs
  let allDocsContext = "";
  let allDocs = [];
  try {
    const snapAll = await db.collection("documents").get();
    const scoredDocs = [];
    snapAll.forEach(docRef => {
      const data = docRef.data();
      const likes = (data.likes && Array.isArray(data.likes)) ? data.likes.length : 0;
      const shares = data.shareCount || 0;
      const clicks = data.ctrCount || 0;
      const score = (likes * 3.0) + (shares * 2.0) + (clicks * 1.0);
      scoredDocs.push({ id: docRef.id, title: data.title, score, pdfUrl: data.pdfUrl, description: data.description, category: data.category, discipline: data.discipline, userId: data.userId, userName: data.userName || data.uploader, tags: data.tags });
      allDocs.push({ id: docRef.id, ...data });
    });

    scoredDocs.sort((a, b) => b.score - a.score);
    const top5 = scoredDocs.slice(0, 5);

    allDocsContext = `
### All Available Resources on DPGNotes (${allDocs.length} total):
${allDocs.map(d => `- **${d.title || 'Untitled'}** | Discipline: ${d.discipline || 'N/A'} | Category: ${d.category || 'N/A'} | Tags: ${d.tags || 'N/A'} | Uploaded by: ${d.userName || d.uploader || 'Unknown'}`).join('\n')}

### Top 5 High-Engagement Resources:
${top5.map((d, i) => `${i+1}. **[${d.title}](https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(d.pdfUrl)}&title=${encodeURIComponent(d.title)})** (Score: ${d.score.toFixed(1)})`).join('\n')}
`;
  } catch (e) {
    console.error("Ranking query failed:", e);
  }

  // 7. All Contributor Profiles
  let contributorsContext = "";
  try {
    const usersSnap = await db.collection("users").get();
    contributorsContext = "### DPGNotes Contributors:\n";
    usersSnap.forEach(u => {
      const d = u.data();
      contributorsContext += `- **${d.name || d.email?.split('@')[0] || 'Unknown'}** | Discipline: ${d.discipline || 'N/A'} | Profile: https://dpgnotes.web.app/profile.html?uid=${u.id}\n`;
    });
  } catch(e) {
    console.error("Contributors fetch failed:", e);
  }

  // 8. Share Link Generation Request Detection
  const msg = userMessage.toLowerCase();
  const isShareLinkRequest = msg.includes("share link") || msg.includes("generate link") || msg.includes("create link") || msg.includes("share url");

  if (isShareLinkRequest) {
    // Try to find matching documents from user's query
    let matchedDocs = allDocs;

    // Filter by keywords in message
    const filterTerms = userMessage.match(/["']([^"']+)["']|([a-zA-Z]{4,})/g) || [];
    if (filterTerms.length > 0) {
      matchedDocs = allDocs.filter(d => {
        const combined = `${d.title} ${d.description} ${d.tags} ${d.discipline} ${d.category}`.toLowerCase();
        return filterTerms.some(term => combined.includes(term.toLowerCase().replace(/['"]/g, '')));
      });
    }

    if (matchedDocs.length === 0) matchedDocs = allDocs.slice(0, 3);

    // Generate share links for matched docs
    const generatedLinks = [];
    for (const docData of matchedDocs.slice(0, 5)) {
      const link = await generateShareLinkForDoc(db, docData);
      if (link) {
        generatedLinks.push({
          title: docData.title || 'Untitled',
          ...link
        });
      }
    }

    if (generatedLinks.length > 0) {
      return `### Share Links Generated 🔗

I found **${generatedLinks.length}** matching resource(s) and generated share links for each:

${generatedLinks.map((l, i) => `**${i+1}. ${l.title}**\n🔗 Share URL: [${l.shareUrl}](${l.shareUrl})\n📋 Token: \`${l.token}\``).join('\n\n')}

> **Note:** These are short tracking share links. Anyone with the link can access the resource directly. Share counts and clicks are tracked in real-time in your analytics.

> 📜 This feature is governed by our [Data Retention Policy](https://dpgnotes.web.app/legal/index.html#retention) and [Terms of Service](https://dpgnotes.web.app/legal/index.html#terms).`;
    } else {
      return `### Share Link Generation 🔗

I could not find any matching documents for your request. Please provide more specific details such as:
- **Title** of the document
- **Discipline** (e.g., "CSE", "AI", "ML")
- **Category** (e.g., "Notes", "PYQ", "Assignment")
- **Uploaded by** (contributor name)

Try: *"Generate a share link for my CSE notes"* or *"Create a share link for the document titled 'Data Structures'"*`;
    }
  }

  // 9. Build comprehensive Gemini prompt
  const systemPrompt = `You are **DPGNotes Intelligence** — an advanced AI academic assistant and analytics engine for DPGNotes, a collaborative note-sharing platform for students.

${rules ? `## Behavioral Rules:\n${rules}\n` : ''}
${communication ? `## Communication Style:\n${communication}\n` : ''}
${knowledge ? `## Domain Knowledge:\n${knowledge}\n` : ''}

## Platform Context:
- DPGNotes URL: https://dpgnotes.web.app
- Dashboard: https://dpgnotes.web.app/dashboard.html
- Legal Center: https://dpgnotes.web.app/legal/index.html
- Support Form: https://dpgnotes.web.app/suspension-support-contact-form.html
- Training Notes: See backend/training.md

## Legal & Policy Reference:
${legalTextsCache ? legalTextsCache.substring(0, 3000) : 'Legal policies apply to all users per DPGNotes Terms of Service.'}

## Real-Time Database Context:
${statsContext}
${allDocsContext}
${contributorsContext}

## Important Notes:
- Contributor Personal Chats are used to dynamically train DPGNotes AI Assistant by creating runtime server training data and updating knowledge from user interactions. This is disclosed in our Legal Policies and Platform Terms.
- Always respond using Markdown formatting with headers, bullet points, bold text, and hyperlinks where appropriate.
- If a user asks about a document, provide the full viewer link: https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?pdf=<encodedUrl>&title=<encodedTitle>
- For share links, use the format: https://dpgnotes.web.app/index.html?share=<token>

## User Query:
${userMessage}

Provide a helpful, comprehensive, and well-formatted Markdown response.`;

  try {
    const response = await askGemini(systemPrompt);
    return response || "I'm unable to generate a response right now. Please try again.";
  } catch (e) {
    console.error("Gemini AI query failed:", e);
    // Fallback to rule-based response
    if (msg.includes("analytic") || msg.includes("like") || msg.includes("upload") || msg.includes("click") || msg.includes("ctr")) {
      return `Here is your real-time analytics report:\n\n${statsContext}\n\n${allDocsContext}`;
    } else if (msg.includes("legal") || msg.includes("privacy") || msg.includes("copyright") || msg.includes("terms") || msg.includes("drasa")) {
      return `### Legal Assistant Console ⚖️\n\nPlease visit the [DPGNotes Legal Center](https://dpgnotes.web.app/legal/index.html) for full policy details.\n\nFor support: [Contact Support](https://dpgnotes.web.app/suspension-support-contact-form.html)`;
    } else {
      return `### Hello! I am DPGNotes AI 🤖\n\nI'm synced with the live database. Try asking:\n- **"Show my upload analytics"**\n- **"What is the DRASA policy?"**\n- **"Generate a share link for my notes"**\n- **"Show top resources"**\n\nHow can I help you today?`;
    }
  }
}

module.exports = {
  handleAiQuery
};
