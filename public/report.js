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
    
    // Auto-trigger AI Chat via url param ?q=
    const q = urlParams.get('q');
    if (q) {
      const input = document.getElementById("reportChatInput");
      if (input) {
        input.value = decodeURIComponent(q);
        sendReportChatQuery();
      }
    }
    
  } catch (err) {
    console.error(err);
    statusTxt.innerText = "Data Retrieval Failed";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Unable to securely fetch report data from server.";
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') {
    return { label: 'Unknown Device', icon: 'ri-question-line', os: 'Unknown', browser: 'Unknown' };
  }
  
  let os = 'Unknown OS';
  let icon = 'ri-device-line';
  
  if (/android/i.test(ua)) {
    os = 'Android';
    icon = 'ri-android-fill';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
    icon = 'ri-apple-fill';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
    icon = 'ri-windows-fill';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    icon = 'ri-apple-fill';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    icon = 'ri-ubuntu-fill';
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS';
    icon = 'ri-chrome-fill';
  }

  let browser = 'Browser';
  if (/edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = /android|iphone|ipad|ipod/i.test(ua) ? 'Chrome Mobile' : 'Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = /android|iphone|ipad|ipod/i.test(ua) ? 'Firefox Mobile' : 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = /iphone|ipad|ipod/i.test(ua) ? 'Safari Mobile' : 'Safari';
  } else if (/bot|crawler|spider/i.test(ua)) {
    browser = 'Bot / Crawler';
    icon = 'ri-robot-line';
  }

  return {
    label: `${os} • ${browser}`,
    icon: icon,
    os: os,
    browser: browser
  };
}

function renderReport(data) {
  const { shareInfo, engagements = [] } = data;
  
  const titleEl = document.getElementById("resourceTitle");
  if (titleEl) titleEl.innerText = shareInfo?.title || "Unknown Document";

  const opensEl = document.getElementById("totalOpens");
  if (opensEl) opensEl.innerText = shareInfo?.clicks || 0;
  
  const uniqueIps = new Set(engagements.map(e => e.ipAddress)).size;
  const uniqueEl = document.getElementById("uniqueVisitors");
  if (uniqueEl) uniqueEl.innerText = uniqueIps;
  
  const unusualCount = engagements.filter(e => e.status === "Unusual").length;
  const unusualEl = document.getElementById("unusualActivity");
  if (unusualEl) unusualEl.innerText = unusualCount;

  const countBadge = document.getElementById("logCountBadge");
  if (countBadge) {
    countBadge.innerText = `${engagements.length} ${engagements.length === 1 ? 'event' : 'events'}`;
  }
  
  const tbody = document.getElementById("engagementsBody");
  const mobileList = document.getElementById("mobileEngagementsList");

  if (engagements.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--report-muted);">No engagement data logged yet.</td></tr>`;
    if (mobileList) mobileList.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--report-muted);">No engagement data logged yet.</div>`;
    window._cachedReportData = data;
    return;
  }
  
  if (tbody) tbody.innerHTML = "";
  if (mobileList) mobileList.innerHTML = "";

  engagements.forEach(e => {
    let timeStr = "Unknown";
    if (e.timestamp) {
      if (e.timestamp._seconds) {
        timeStr = new Date(e.timestamp._seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      } else if (typeof e.timestamp === 'string' || typeof e.timestamp === 'number') {
        timeStr = new Date(e.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      } else if (e.timestamp.toDate && typeof e.timestamp.toDate === 'function') {
        timeStr = e.timestamp.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      }
    }
    
    const badgeClass = e.status === "Unusual" ? "badge-unusual" : "badge-usual";
    const statusText = escapeHtml(e.status || "Usual");
    const ip = escapeHtml(e.ipAddress || "Unknown");
    const rawUa = escapeHtml(e.userAgent || "Unknown");
    const devInfo = parseUserAgent(e.userAgent);
    
    // Desktop Table Row
    if (tbody) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--report-muted); white-space:nowrap;"><i class="ri-time-line" style="vertical-align:middle; margin-right:4px;"></i>${timeStr}</td>
        <td><span class="ip-pill"><i class="ri-shield-keyhole-line"></i> ${ip}</span></td>
        <td><span class="badge ${badgeClass}"><i class="${e.status === 'Unusual' ? 'ri-alert-line' : 'ri-checkbox-circle-line'}"></i> ${statusText}</span></td>
        <td>
          <div class="device-pill" title="${rawUa}">
            <i class="${devInfo.icon}"></i>
            <span>${escapeHtml(devInfo.label)}</span>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    // Mobile Card Item
    if (mobileList) {
      const card = document.createElement("div");
      card.className = "log-card";
      card.innerHTML = `
        <div class="log-card-top">
          <span class="badge ${badgeClass}"><i class="${e.status === 'Unusual' ? 'ri-alert-line' : 'ri-checkbox-circle-line'}"></i> ${statusText}</span>
          <span class="log-card-time"><i class="ri-time-line"></i> ${timeStr}</span>
        </div>
        <div class="log-card-rows">
          <div class="log-row-item">
            <span class="log-row-label"><i class="ri-shield-keyhole-line"></i> IP Address:</span>
            <span class="ip-pill">${ip}</span>
          </div>
          <div class="log-row-item">
            <span class="log-row-label"><i class="ri-device-line"></i> Platform:</span>
            <span class="device-badge"><i class="${devInfo.icon}"></i> ${escapeHtml(devInfo.label)}</span>
          </div>
          <details class="log-raw-ua">
            <summary><i class="ri-terminal-window-line"></i> Raw User-Agent</summary>
            <div class="raw-ua-content">${rawUa}</div>
          </details>
        </div>
      `;
      mobileList.appendChild(card);
    }
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
  
  if (!token) {
    if (window.customAlert) window.customAlert("Admin session required.", "Authentication Error");
    else alert("Admin session required.");
    return;
  }
  if (!window._cachedReportData) {
    if (window.customAlert) window.customAlert("Report data not loaded yet.", "Please Wait");
    else alert("Report data not loaded yet.");
    return;
  }

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
