const API_URL = window.API_BASE_URL + "/api";
async function initReport() {
  const overlay = document.getElementById("authCheckOverlay");
  const container = document.getElementById("reportContainer");
  const statusTxt = document.getElementById("authStatusText");
  const subTxt = document.getElementById("authSubText");
  const token = localStorage.getItem("adminToken");
  if (!token) {
    statusTxt.innerText = "Access Denied";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "No active admin session found. Redirecting to Admin Portal...";
    setTimeout(() => { window.location.href = "admin-login.html"; }, 2500);
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const shareCode = urlParams.get('code') || urlParams.get('token') || urlParams.get('share') || urlParams.get('shareToken');
  if (!shareCode) {
    statusTxt.innerText = "Invalid Request";
    statusTxt.style.color = "var(--report-danger)";
    subTxt.innerText = "Missing share code parameter. Redirecting...";
    setTimeout(() => { window.location.href = "admin.html"; }, 2500);
    return;
  }
  try {
    let data = null;
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      try {
        const res = await fetch(`${API_URL}/admin/share-report/${encodeURIComponent(shareCode)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
        });
        if (res.ok) {
          data = await res.json();
          break;
        } else if (res.status === 401 || res.status === 403) {
          statusTxt.innerText = "Session Expired";
          statusTxt.style.color = "var(--report-danger)";
          subTxt.innerText = "Your admin session is invalid or expired. Redirecting...";
          localStorage.removeItem("adminToken");
          setTimeout(() => { window.location.href = "admin-login.html"; }, 2500);
          return;
        } else if (res.status === 404) {
          break;
        }
      } catch(fetchErr) {
        console.warn("API report fetch warning (attempt " + (attempt + 1) + "):", fetchErr);
      }
    }
    if (!data) {
      try {
        const fsUrl = `https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/share_links/${encodeURIComponent(shareCode)}`;
        const fsRes = await fetch(fsUrl);
        if (fsRes.ok) {
          const fsJson = await fsRes.json();
          const fields = fsJson.fields || {};
          const info = {};
          for (const [k, v] of Object.entries(fields)) {
            info[k] = v.stringValue !== undefined ? v.stringValue : 
                     (v.integerValue !== undefined ? Number(v.integerValue) : 
                     (v.booleanValue !== undefined ? v.booleanValue : 
                     (v.timestampValue !== undefined ? v.timestampValue :
                     (v.arrayValue?.values ? v.arrayValue.values.map(x => x.stringValue) : null))));
          }
          if ((info.type === 'note' || String(shareCode).startsWith('NT-')) && info.docId) {
            if (!info.docTitle) {
              try {
                const pdRes = await fetch(`https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/documents/${encodeURIComponent(info.docId)}`);
                if (pdRes.ok) {
                  const pdJson = await pdRes.json();
                  const pf = pdJson.fields || {};
                  if (pf.title?.stringValue) info.docTitle = pf.title.stringValue;
                  if (pf.category?.stringValue) info.docCategory = pf.category.stringValue;
                  if (pf.pdfUrl?.stringValue) info.pdfUrl = pf.pdfUrl.stringValue;
                }
              } catch(_) {}
            }
            const elem = info.elementId || (info.noteId ? `${(info.rendering || 'after') === 'before' ? 'be' : 'af'}-${info.noteId}` : '');
            info.directViewerUrl = `https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?id=${encodeURIComponent(info.docId)}${elem ? `&note=${encodeURIComponent(elem)}` : ''}&share=${encodeURIComponent(info.token || shareCode)}${elem ? `#note-${encodeURIComponent(elem)}` : ''}`;
          }
          data = {
            shareInfo: info,
            engagements: []
          };
        }
      } catch(fsErr) {
        console.warn("Direct Firestore fallback error:", fsErr);
      }
    }
    if (!data) {
      throw new Error("Unable to locate share link records.");
    }
    overlay.style.display = "none";
    container.style.display = "block";
    renderReport(data);
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
  const isNoteShare = shareInfo?.type === 'note' || (shareInfo?.token && String(shareInfo.token).startsWith('NT-'));
  const displayTitle = (isNoteShare && shareInfo?.docTitle)
    ? `${shareInfo.docTitle} — Note (Pg ${shareInfo.pageNumber || 1})`
    : (shareInfo?.docTitle || shareInfo?.title || "Unknown Document");
  const titleEl = document.getElementById("resourceTitle");
  if (titleEl) {
    titleEl.innerText = displayTitle;
    titleEl.title = displayTitle;
  }
  const banner = document.getElementById("shareContextBanner");
  if (banner && shareInfo) {
    const shareCodeLabel = escapeHtml(shareInfo.token || '');
    const typeChip = isNoteShare
      ? `<span style="background:rgba(168,85,247,0.2); color:#c084fc; border:1px solid rgba(168,85,247,0.4); padding:3px 9px; border-radius:6px; font-size:0.75rem; font-weight:700;">📝 IN-DOCUMENT NOTE (Pg ${escapeHtml(String(shareInfo.pageNumber || 1))}${shareInfo.rendering ? ' • ' + escapeHtml(shareInfo.rendering) : ''})</span>`
      : `<span style="background:rgba(56,189,248,0.18); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); padding:3px 9px; border-radius:6px; font-size:0.75rem; font-weight:700;">🔗 ${escapeHtml((shareInfo.type || 'document').toUpperCase())} SHARE</span>`;
    const elemId = shareInfo.elementId || (shareInfo.noteId ? `${(shareInfo.rendering || 'after') === 'before' ? 'be' : 'af'}-${shareInfo.noteId}` : '');
    const openUrl = shareInfo.directViewerUrl || (isNoteShare && shareInfo.docId
      ? `https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?id=${encodeURIComponent(shareInfo.docId)}${elemId ? `&note=${encodeURIComponent(elemId)}` : ''}&share=${encodeURIComponent(shareInfo.token || '')}${elemId ? `#note-${encodeURIComponent(elemId)}` : ''}`
      : '');
    const creatorLabel = escapeHtml(shareInfo.uploader || shareInfo.noteUploaderName || shareInfo.generatedBy || 'Guest');
    const previewSnippet = shareInfo.notePreview ? `<div style="margin-top:0.45rem; font-size:0.82rem; color:#cbd5e1; background:rgba(0,0,0,0.25); padding:0.45rem 0.7rem; border-radius:8px; border-left:3px solid #a855f7;">"${escapeHtml(shareInfo.notePreview)}${shareInfo.notePreview.length >= 160 ? '...' : ''}"</div>` : '';
    const likesMeta = typeof shareInfo.noteLikesCount === 'number' ? `<span style="color:#f472b6; font-weight:600;">❤️ ${shareInfo.noteLikesCount} note likes</span>` : '';
    banner.innerHTML = `
      <div style="flex:1; min-width:240px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:0.35rem;">
          ${typeChip}
          ${shareCodeLabel ? `<span style="font-family:monospace; background:rgba(99,102,241,0.18); color:#a5b4fc; padding:2px 8px; border-radius:6px; font-size:0.78rem; font-weight:700;">Code: ${shareCodeLabel}</span>` : ''}
          ${shareInfo.elementId ? `<span style="font-family:monospace; color:#94a3b8; font-size:0.75rem;">Anchor: #note-${escapeHtml(shareInfo.elementId)}</span>` : ''}
        </div>
        <div style="font-size:0.82rem; color:var(--report-muted); display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
          <span><strong style="color:#e2e8f0;">Shared by:</strong> ${creatorLabel}</span>
          ${shareInfo.docCategory ? `<span><strong style="color:#e2e8f0;">Category:</strong> ${escapeHtml(shareInfo.docCategory)}</span>` : ''}
          ${likesMeta}
        </div>
        ${previewSnippet}
      </div>
      ${openUrl ? `<a href="${escapeHtml(openUrl)}" target="_blank" rel="noopener noreferrer" class="back-btn" style="background:linear-gradient(135deg,#8b5cf6,#6366f1); color:white; border:none; text-decoration:none; white-space:nowrap;"><i class="ri-external-link-line"></i> <span>${isNoteShare ? 'Open Shared Note' : 'Open Shared Link'}</span></a>` : ''}
    `;
    banner.style.display = "flex";
  }
  const opensEl = document.getElementById("totalOpens");
  if (opensEl) opensEl.innerText = shareInfo?.clicks || engagements.length || 0;
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
    const visitorLabel = escapeHtml(e.openedBy || "Guest");
    const rawUa = escapeHtml(e.userAgent || "Unknown");
    const devInfo = parseUserAgent(e.userAgent);
    if (tbody) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--report-muted); white-space:nowrap;"><i class="ri-time-line" style="vertical-align:middle; margin-right:4px;"></i>${timeStr}</td>
        <td>
          <span class="ip-pill"><i class="ri-shield-keyhole-line"></i> ${ip}</span>
          <div style="font-size:0.72rem; color:var(--report-muted); margin-top:3px;"><i class="ri-user-line"></i> ${visitorLabel}</div>
        </td>
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
            <span class="log-row-label"><i class="ri-user-line"></i> Visitor:</span>
            <span style="color:#e2e8f0; font-size:0.82rem; font-weight:600;">${visitorLabel}</span>
          </div>
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
  window._cachedReportData = data;
}
let reportChatHistory = [];
function appendReportChatMessage(role, text) {
  const chatArea = document.getElementById("reportChatArea");
  if (!chatArea) return;
  const ph = chatArea.querySelector(".ph");
  if (ph) ph.remove();
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${role}`;
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
          title: window._cachedReportData.shareInfo?.docTitle || window._cachedReportData.shareInfo?.title || "Unknown",
          shareType: window._cachedReportData.shareInfo?.type || "document",
          pageNumber: window._cachedReportData.shareInfo?.pageNumber || null,
          noteId: window._cachedReportData.shareInfo?.noteId || null,
          totalClicks: window._cachedReportData.shareInfo?.clicks || 0,
          engagements: (window._cachedReportData.engagements || []).slice(0, 30).map(e => ({
            ip: e.ipAddress,
            openedBy: e.openedBy,
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
          reportTitle: window._cachedReportData?.shareInfo?.docTitle || window._cachedReportData?.shareInfo?.title || "Unknown",
          shareType: window._cachedReportData?.shareInfo?.type || "document",
          pageNumber: window._cachedReportData?.shareInfo?.pageNumber || null,
          notePreview: window._cachedReportData?.shareInfo?.notePreview || "",
          totalClicks: window._cachedReportData?.shareInfo?.clicks || 0,
          recentEngagements: (window._cachedReportData?.engagements || []).slice(0, 15).map(e => ({
            ip: e.ipAddress,
            openedBy: e.openedBy,
            status: e.status,
            agent: e.userAgent
          }))
        }
      })
    });
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
