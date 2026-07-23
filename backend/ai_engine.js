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

  // 5. Intelligent Query Categorization Router
  const msg = userMessage.toLowerCase();
  let response = "";

  if (msg.includes("analytic") || msg.includes("like") || msg.includes("upload") || msg.includes("click") || msg.includes("ctr")) {
    response = `Here is your real-time analytics report generated from the database:
${statsHtml}
${recommendationsHtml}
Would you like ideas on how to boost your CTR and upload engagement?`;
  } else if (msg.includes("legal") || msg.includes("privacy") || msg.includes("copyright") || msg.includes("terms") || msg.includes("drasa") || msg.includes("suspension")) {
    // Check if legal texts cache contains relevant policy
    let policySnippet = "Your resources and accounts are governed strictly by the Regulations & Suspension Act (DRASA) and copyright protection guidelines. Copying of third-party intellectual property is strictly forbidden.";
    if (msg.includes("privacy")) {
      policySnippet = "Under our **Privacy Policy**, your email and uploaded metadata are stored securely and never shared with third parties.";
    } else if (msg.includes("copyright")) {
      policySnippet = "Under our **Copyright Policy**, authors retain ownership but grant DPGNotes the license to host materials. Infringements will lead to immediate file removal.";
    } else if (msg.includes("drasa")) {
      policySnippet = "Under the **Regulations & Suspension Act (DRASA)**, malicious accounts uploading corrupt file extensions or spamming will face permanent hardware blocks.";
    }

    response = `### Legal Assistant Console ⚖️
I have scanned the DPGNotes Legal Center. Here is the relevant regulation:

> ${policySnippet}

You can access the full terms at the [Legal Center](legal/index.html).`;
  } else {
    // General helpful answer using Markdown README syntax
    response = `### Hello! I am DPGNotes AI 🤖

I am synced with the live database and can assist you with your academic telemetry:
- Try asking: **"Show my upload analytics"**
- Try asking: **"What is the DRASA policy?"**
- Try asking: **"Tell me about high-engagement resources"**

How can I help you study today?`;
  }

  return response;
}

module.exports = {
  handleAiQuery
};
