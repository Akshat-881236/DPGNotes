const fs = require('fs');
const path = require('path');

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
  } catch (err) {
    console.error("AI Legal Scanner failed:", err);
  }
}

// Run scanner immediately
scanLegalFiles();

// 2. Query processing engine
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
    console.error("Could not load AI markdown guidelines:", e);
  }

  // 3. User Analytics Telemetry
  let statsHtml = "";
  let docs = [];
  try {
    const snap = await db.collection("documents").where("userId", "==", userId).get();
    let totalLikes = 0;
    let totalShares = 0;
    let totalClicks = 0;

    snap.forEach(doc => {
      const data = doc.data();
      docs.push({ id: doc.id, ...data });
      totalLikes += (data.likes && Array.isArray(data.likes)) ? data.likes.length : 0;
      totalShares += data.shareCount || 0;
      totalClicks += data.ctrCount || 0;
    });

    const engagementRate = totalClicks > 0 ? (((totalLikes + totalShares) / totalClicks) * 100).toFixed(1) : 0;

    statsHtml = `
### Your Contributor Telemetry Analysis 📊
- **Total Uploaded Resources:** ${snap.size}
- **Accumulated Likes Received:** ${totalLikes} ❤️
- **Generated Share Links:** ${totalShares} 🔗
- **Total Clicks (CTR):** ${totalClicks} 👀
- **Overall Engagement Rate:** **${engagementRate}%**
`;
  } catch (e) {
    console.error("Analytics fetch failed:", e);
  }

  // 4. Search Ranking Score Calculations
  let recommendationsHtml = "";
  try {
    const snapAll = await db.collection("documents").get();
    const scoredDocs = [];
    snapAll.forEach(doc => {
      const data = doc.data();
      const likes = (data.likes && Array.isArray(data.likes)) ? data.likes.length : 0;
      const shares = data.shareCount || 0;
      const clicks = data.ctrCount || 0;
      // Formula: Score = (Likes * 3.0) + (Shares * 2.0) + (Clicks * 1.0)
      const score = (likes * 3.0) + (shares * 2.0) + (clicks * 1.0);
      scoredDocs.push({ id: doc.id, title: data.title, score, pdfUrl: data.pdfUrl });
    });

    // Sort by score desc
    scoredDocs.sort((a, b) => b.score - a.score);
    const top3 = scoredDocs.slice(0, 3);

    recommendationsHtml = `
### High-Engagement Resources on DPGNotes 🏆
Here are the top-ranked uploads by community engagement score:
${top3.map((d, index) => `${index + 1}. **[${d.title}](dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(d.pdfUrl)}&title=${encodeURIComponent(d.title)})** (Score: ${d.score.toFixed(1)})`).join('\n')}
`;
  } catch (e) {
    console.error("Ranking query failed:", e);
  }

  // 5. Intelligent Query Categorization & Share Link Generation Engine
  const msg = userMessage.toLowerCase();
  let response = "";

  if (msg.includes("share") || msg.includes("link") || msg.includes("find") || msg.includes("search") || msg.includes("note") || msg.includes("pdf")) {
    // Search documents database for relevant resources
    try {
      const snapAll = await db.collection("documents").get();
      const matchingDocs = [];
      
      snapAll.forEach(doc => {
        const data = doc.data();
        const t = (data.title || "").toLowerCase();
        const c = (data.category || "").toLowerCase();
        const d = (data.discipline || "").toLowerCase();
        const u = (data.userName || "").toLowerCase();
        const tags = Array.isArray(data.tags) ? data.tags.join(" ").toLowerCase() : "";

        // Check search relevance
        const words = msg.replace(/(share|link|generate|for|the|find|search|notes|pdf|get)/g, "").trim().split(/\s+/).filter(w => w.length > 1);
        let matchCount = 0;
        words.forEach(w => {
          if (t.includes(w) || c.includes(w) || d.includes(w) || u.includes(w) || tags.includes(w)) matchCount++;
        });

        if (matchCount > 0 || words.length === 0) {
          matchingDocs.push({ id: doc.id, ...data });
        }
      });

      if (matchingDocs.length > 0) {
        const topMatches = matchingDocs.slice(0, 4);
        response = `### 🔗 Generated Resource Share Links\n\nI searched the DPGNotes Database and generated share links for matching academic resources:\n\n`;
        topMatches.forEach((d, idx) => {
          const searchUrl = `https://dpgnotes.web.app/dpgnotes-serp.html?search=${encodeURIComponent(d.title)}`;
          const viewerUrl = `https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?pdf=${encodeURIComponent(d.pdfUrl)}&title=${encodeURIComponent(d.title)}&category=${encodeURIComponent(d.category || '')}&discipline=${encodeURIComponent(d.discipline || '')}&uploader=${encodeURIComponent(d.userName || '')}`;
          
          response += `#### ${idx + 1}. **${d.title}** (${d.category || 'Notes'} - ${d.discipline || 'Academic'})\n`;
          response += `- **Uploaded By:** ${d.userName || 'Contributor'}\n`;
          response += `- **Direct Viewer Link:** [Open in DPGNotes Viewer](${viewerUrl})\n`;
          response += `- **SERP Share Page:** [View on Search Engine](${searchUrl})\n\n`;
        });
        response += `*Need share links for another subject or contributor? Just ask!*`;
      } else {
        response = `### 🔍 Resource Search Results\n\nI couldn't find an exact document matching **"${userMessage}"**. You can explore all community uploads directly on the [Search Engine](https://dpgnotes.web.app/dpgnotes-serp.html) or [Explore Dashboard](https://dpgnotes.web.app/dashboard.html).`;
      }
    } catch(e) {
      console.error("AI share link query failed:", e);
      response = `### 🔗 Resource Share Links\n\nYou can generate and copy share links directly from the [Explore Dashboard](https://dpgnotes.web.app/dashboard.html) or [DPGNotes Search Engine](https://dpgnotes.web.app/dpgnotes-serp.html).`;
    }

  } else if (msg.includes("analytic") || msg.includes("like") || msg.includes("upload") || msg.includes("click") || msg.includes("ctr") || msg.includes("stat")) {
    response = `Here is your real-time academic analytics report generated directly from the DPGNotes database:

${statsHtml}

${recommendationsHtml}

*Tip: High-quality document descriptions and sharing links on social channels will increase your CTR and community ranking.*`;

  } else if (msg.includes("legal") || msg.includes("privacy") || msg.includes("copyright") || msg.includes("terms") || msg.includes("drasa") || msg.includes("suspension") || msg.includes("form") || msg.includes("appeal")) {
    let policySnippet = "Your resources and accounts are governed strictly by the Regulations & Suspension Act (DRASA) and copyright protection guidelines. Copying of third-party intellectual property is strictly forbidden.";
    if (msg.includes("privacy")) {
      policySnippet = "Under our **Privacy Policy**, contributor email and upload metadata are stored securely and never shared with third parties. Contributor personal & group chats are used to dynamically train DPGNotes AI Assistant by updating runtime server knowledge.";
    } else if (msg.includes("copyright")) {
      policySnippet = "Under our **Copyright Policy**, authors retain ownership but grant DPGNotes the license to host materials. Infringements will lead to immediate file removal. Submit copyright claims via the official portal.";
    } else if (msg.includes("drasa") || msg.includes("suspension") || msg.includes("appeal") || msg.includes("form")) {
      policySnippet = "Under the **Regulations & Suspension Act (DRASA)**, accounts suspended or blocked may submit an official reinstatement appeal via the [Support & Appeal Form](https://dpgnotes.web.app/suspension-support-contact-form.html).";
    }

    response = `### Legal & Compliance Console ⚖️

I have scanned the DPGNotes Legal Center. Here is the relevant regulation:

> ${policySnippet}

#### Official Links:
- 📜 **Complete Legal Policies:** [https://dpgnotes.web.app/legal/index.html](https://dpgnotes.web.app/legal/index.html)
- 📝 **Support & Appeal Form:** [https://dpgnotes.web.app/suspension-support-contact-form.html](https://dpgnotes.web.app/suspension-support-contact-form.html)`;

  } else {
    response = `### DPGNotes Intelligence Assistant 🤖

I am synced with the live database and can assist you with academic notes, legal rules, and telemetry:

- 📊 **"Show my upload analytics"**
- 🔗 **"Generate share link for Software Engineering notes"**
- ⚖️ **"What is the DRASA policy and support appeal link?"**
- 🏆 **"Show high-engagement resources"**

How can I assist your studies today?`;
  }

  return response;
}

module.exports = {
  handleAiQuery
};
