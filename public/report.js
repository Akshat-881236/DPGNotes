const API_URL = window.API_BASE_URL + "/api";

async function initReport() {
  const overlay = document.getElementById("authCheckOverlay");
  const container = document.getElementById("reportContainer");
  const statusTxt = document.getElementById("authStatusText");
  const subTxt = document.getElementById("authSubText");
  
  // 1. Check Admin Session
  const token = localStorage.getItem("adminToken");
  if (!token) {
    statusTxt.innerText = "Access Denied";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "No active admin session found. Redirecting to Admin Portal...";
    setTimeout(() => { window.location.href = "admin.html"; }, 2500);
    return;
  }
  
  // 2. Check Param Logic
  const urlParams = new URLSearchParams(window.location.search);
  const shareCode = urlParams.get('code');
  
  if (!shareCode) {
    statusTxt.innerText = "Invalid Request";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Missing share code parameter. Redirecting...";
    setTimeout(() => { window.location.href = "admin.html"; }, 2500);
    return;
  }
  
  // 3. Content Access from Server (Secure Fetch)
  try {
    const res = await fetch(`${API_URL}/admin/share-report/${shareCode}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        statusTxt.innerText = "Session Expired";
        statusTxt.style.color = "var(--report-danger)";
        subTxt.innerText = "Your admin session is invalid or expired. Redirecting...";
        localStorage.removeItem("adminToken");
        setTimeout(() => { window.location.href = "admin.html"; }, 2500);
        return;
      }
      throw new Error("Failed to fetch report data");
    }
    
    const data = await res.json();
    overlay.style.display = "none";
    container.style.display = "block";
    renderReport(data);
    
  } catch (err) {
    console.error(err);
    statusTxt.innerText = "Data Retrieval Failed";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Unable to securely fetch report data from server.";
  }
}

function renderReport(data) {
  const { shareInfo, engagements } = data;
  
  document.getElementById("resourceTitle").innerText = shareInfo.title || "Unknown Document";
  document.getElementById("totalOpens").innerText = shareInfo.clicks || 0;
  
  const uniqueIps = new Set(engagements.map(e => e.ipAddress)).size;
  document.getElementById("uniqueVisitors").innerText = uniqueIps;
  
  const unusualCount = engagements.filter(e => e.status === "Unusual").length;
  document.getElementById("unusualActivity").innerText = unusualCount;
  
  const tbody = document.getElementById("engagementsBody");
  if (engagements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No engagement data yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = "";
  engagements.forEach(e => {
    let timeStr = "Unknown";
    if (e.timestamp && e.timestamp._seconds) {
      timeStr = new Date(e.timestamp._seconds * 1000).toLocaleString();
    }
    
    const badgeClass = e.status === "Unusual" ? "badge-unusual" : "badge-usual";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color:var(--report-muted);">${timeStr}</td>
      <td style="font-family:monospace;">${e.ipAddress || "Unknown"}</td>
      <td><span class="badge ${badgeClass}">${e.status || "Usual"}</span></td>
      <td style="font-size:0.85rem; color:var(--report-muted); max-width: 300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${e.userAgent}">
        ${e.userAgent || "Unknown"}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Cache report data for AI analysis
  window._cachedReportData = data;
}

// Conversational Chat AI logic for report.html
let reportChatHistory = [];

function appendReportChatMessage(role, text) {
  const chatArea = document.getElementById("reportChatArea");
  if (!chatArea) return;

  // Remove placeholder if present
  const ph = chatArea.querySelector(".ph");
  if (ph) ph.remove();

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${role}`;
  
  // Custom styles for user/ai messages
  if (role === 'user') {
    msgDiv.style.alignSelf = 'flex-end';
    msgDiv.style.background = 'linear-gradient(135deg, #8b5cf6, #6366f1)';
    msgDiv.style.color = 'white';
    msgDiv.style.padding = '0.55rem 0.8rem';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.borderBottomRightRadius = '2px';
    msgDiv.style.fontSize = '0.85rem';
    msgDiv.style.lineHeight = '1.4';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.wordBreak = 'break-word';
  } else {
    msgDiv.style.alignSelf = 'flex-start';
    msgDiv.style.background = 'rgba(255,255,255,0.05)';
    msgDiv.style.border = '1px solid rgba(255,255,255,0.08)';
    msgDiv.style.padding = '0.6rem 0.9rem';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.borderBottomLeftRadius = '2px';
    msgDiv.style.fontSize = '0.88rem';
    msgDiv.style.lineHeight = '1.45';
    msgDiv.style.color = '#e2e8f0';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.wordBreak = 'break-word';
  }

  msgDiv.innerHTML = role === 'ai' && typeof renderMarkdown === 'function' 
    ? renderMarkdown(text) 
    : text.replace(/\n/g, '<br>');

  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Update state array
  reportChatHistory.push({ role, text });
}

window.runAiAnalysis = async function() {
  const btn = document.getElementById("runAiAnalysisBtn");
  const token = localStorage.getItem("adminToken");
  
  if (!token) { alert("Admin session required."); return; }
  if (!window._cachedReportData) { alert("Report data not loaded yet."); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line"></i> Generating...';
  appendReportChatMessage('ai', '🤖 *DPGNotes Intelligence is compiling your compliance brief...*');

  try {
    const res = await fetch(window.API_BASE_URL + "/api/ai/screen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        type: "report",
        data: {
          title: window._cachedReportData.shareInfo?.title || "Unknown",
          totalClicks: window._cachedReportData.shareInfo?.clicks || 0,
          engagements: (window._cachedReportData.engagements || []).slice(0, 30).map(e => ({
            ip: e.ipAddress,
            status: e.status,
            agent: e.userAgent
          }))
        }
      })
    });
    const aiData = await res.json();
    if (aiData.report) {
      appendReportChatMessage('ai', aiData.report);
    } else {
      appendReportChatMessage('ai', '⚠️ No analysis could be returned. Please retry.');
    }
  } catch(err) {
    appendReportChatMessage('ai', '❌ Failed to analyze: ' + err.message);
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="ri-sparkling-line"></i> Compile compliance brief';
};

window.sendReportChatQuery = async function() {
  const input = document.getElementById("reportChatInput");
  const btn = document.getElementById("reportChatSendBtn");
  if (!input || !btn) return;
  
  const question = input.value.trim();
  if (!question) return;

  input.value = "";
  btn.disabled = true;
  
  appendReportChatMessage('user', question);
  
  // Show thinking animation
  const chatArea = document.getElementById("reportChatArea");
  const thinkingDiv = document.createElement("div");
  thinkingDiv.id = "reportThinking";
  thinkingDiv.style.alignSelf = 'flex-start';
  thinkingDiv.style.color = '#a78bfa';
  thinkingDiv.style.fontSize = '0.85rem';
  thinkingDiv.innerHTML = '🤖 <em>Thinking...</em>';
  chatArea.appendChild(thinkingDiv);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    const res = await fetch(window.API_BASE_URL + "/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: reportChatHistory,
        question: question,
        context: {
          reportTitle: window._cachedReportData?.shareInfo?.title || "Unknown",
          totalClicks: window._cachedReportData?.shareInfo?.clicks || 0,
          recentEngagements: (window._cachedReportData?.engagements || []).slice(0, 15).map(e => ({
            ip: e.ipAddress,
            status: e.status,
            agent: e.userAgent
          }))
        }
      })
    });
    
    // Remove thinking indicator
    const thinking = document.getElementById("reportThinking");
    if (thinking) thinking.remove();

    const data = await res.json();
    if (data.answer) {
      appendReportChatMessage('ai', data.answer);
    } else {
      appendReportChatMessage('ai', '⚠️ No response received from DPGNotes AI.');
    }
  } catch (err) {
    const thinking = document.getElementById("reportThinking");
    if (thinking) thinking.remove();
    appendReportChatMessage('ai', '❌ Error connecting to AI assistant: ' + err.message);
  }
  btn.disabled = false;
};

document.addEventListener("DOMContentLoaded", initReport);
